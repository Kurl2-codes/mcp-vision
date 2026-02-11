import os
import io
import re
import base64
import shutil
import uuid
import traceback
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
from pymongo import MongoClient
import tensorflow as tf 

# Import DeepFace safely
FACE_REC_AVAILABLE = False
try:
    from deepface import DeepFace
    FACE_REC_AVAILABLE = True
    print("DeepFace imported successfully.")
except Exception as e:
    print(f"WARNING: DeepFace could not be imported. Face recognition will be disabled. Error: {e}")

# Import existing MCP tools
from mcp_vision.server import locate_objects, zoom_to_object, init_objdet_pipeline
from mcp_vision.utils import pil_to_base64

load_dotenv()

# Read Questionnaire
QUESTIONNAIRE_TEXT = ""
try:
    if os.path.exists("vlm_vla_questionnaire.md"):
        with open("vlm_vla_questionnaire.md", "r", encoding="utf-8") as f:
            QUESTIONNAIRE_TEXT = f.read()
except Exception as e:
    print(f"Warning: Could not read questionnaire file: {e}")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for images
os.makedirs("images/uploads", exist_ok=True)
os.makedirs("images/faces", exist_ok=True)
app.mount("/images", StaticFiles(directory="images"), name="images")

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "mcp_vision_db")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    db = client[MONGO_DB_NAME]
    history_collection = db["history"]
    faces_collection = db["faces"]
    sessions_collection = db["sessions"]
    print("Connected to MongoDB.")
except Exception as e:
    print(f"Warning: Could not connect to MongoDB: {e}")

# Initialize MCP models on startup
@app.on_event("startup")
async def startup_event():
    print("Initializing Object Detection Pipeline...")
    init_objdet_pipeline()
    print("Pipeline Initialized.")

def _register_face_internal(image: Image.Image, name: str) -> str:
    """
    Internal helper to save face image, clear pickle, and return a description.
    """
    # Create folder for person
    person_dir = os.path.join("images/faces", name)
    os.makedirs(person_dir, exist_ok=True)

    # Save image for Face Rec training
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(person_dir, filename)
    image.save(filepath)
    
    # Also copy to uploads for history/display
    history_filename = f"{uuid.uuid4()}.jpg"
    history_filepath = os.path.join("images/uploads", history_filename)
    image.save(history_filepath)

    # Remove the pickle file to force DeepFace to re-scan the DB next time
    pkl_path = os.path.join("images/faces", "representations_vgg_face.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
        
    # --- Run Gemini Analysis for Metadata ---
    if GEMINI_API_KEY:
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        analysis_prompt = f"Describe the appearance of this person named {name}. Include details about clothing, colors, and accessories."
        response = model.generate_content([analysis_prompt, image])
        analysis_text = response.text
    else:
        analysis_text = "Analysis unavailable (No API Key)"
    
    # Save to MongoDB History
    log_entry = {
        "timestamp": datetime.now(),
        "filepath": history_filepath,
        "prompt": f"Register Face: {name}",
        "analysis": analysis_text,
        "identities": [name], 
        "type": "registration"
    }
    if 'history_collection' in globals():
        history_collection.insert_one(log_entry)
        
    return analysis_text

def _search_memory(query: str, limit: int = 5) -> str:
    """
    Searches MongoDB history for relevant context.
    Simple keyword search for now.
    """
    if 'history_collection' not in globals():
        return ""
        
    try:
        # 1. Extract keywords (naive split)
        keywords = [k for k in query.split() if len(k) > 3]
        if not keywords:
            # If no keywords, just get latest
            cursor = history_collection.find().sort("timestamp", -1).limit(limit)
        else:
            # Construction regex query for ANY keyword
            regex_pattern = "|".join([re.escape(k) for k in keywords])
            # Search in analysis, prompt, or identities
            query_filter = {
                "$or": [
                    {"analysis": {"$regex": regex_pattern, "$options": "i"}},
                    {"prompt": {"$regex": regex_pattern, "$options": "i"}},
                    {"identities": {"$elemMatch": {"$regex": regex_pattern, "$options": "i"}}}
                ]
            }
            cursor = history_collection.find(query_filter).sort("timestamp", -1).limit(limit)
            
        # Format context
        context_parts = []
        for doc in cursor:
            date_str = doc.get("timestamp", datetime.now()).strftime("%Y-%m-%d %H:%M")
            identities = ", ".join(doc.get("identities", []))
            analysis = doc.get("analysis", "")[:500] # Truncate long analyses
            context_parts.append(f"[{date_str}] Found {identities}: {analysis}")
            
        return "\n\n".join(context_parts)
    except Exception as e:
        print(f"Search Error: {e}")
        return ""

class AnalyzeRequest(BaseModel):
    image_base64: Optional[str] = None
    prompt: str
    session_id: Optional[str] = None

class ZoomRequest(BaseModel):
    image_base64: str
    label: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MCP Vision API is running"}

@app.post("/questionnaire")
async def process_questionnaire(request: AnalyzeRequest):
    """
    Process the full VLA questionnaire in a single batch request.
    Uses Gemini 1.5 Flash (Lowest Cost).
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    try:
        # Decode image
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # KEY FIX: Convert RGBA to RGB
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        # Prepare Prompt
        full_prompt = (
            "You are a Vision Language Model evaluator. "
            "Please analyze the attached image and answer the following questionnaire. "
            "Provide the answers in a structured format corresponding to the sections.\n\n"
            f"{QUESTIONNAIRE_TEXT}"
        )
        
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        response = model.generate_content([full_prompt, image])
        
        return {"response": response.text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions")
async def create_session():
    """Start a new chat session"""
    session_id = str(uuid.uuid4())
    session_data = {
        "session_id": session_id,
        "title": "New Chat",
        "timestamp": datetime.now(),
        "messages": []
    }
    if 'sessions_collection' in globals():
        sessions_collection.insert_one(session_data)
    return {"session_id": session_id, "title": "New Chat"}

@app.get("/sessions")
async def get_sessions():
    """List all previous sessions"""
    if 'sessions_collection' not in globals():
        return {"sessions": []}
    
    cursor = sessions_collection.find({}, {"_id": 0, "messages": 0}).sort("timestamp", -1)
    sessions = list(cursor)
    return {"sessions": sessions}

@app.get("/sessions/{session_id}")
async def get_session_history(session_id: str):
    """Get full history for a session"""
    if 'sessions_collection' not in globals():
        raise HTTPException(status_code=404, detail="Database unavailable")
        
    session = sessions_collection.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session

@app.post("/analyze")
async def analyze_image(request: AnalyzeRequest):
    """
    Analyzes an image using Gemini Flash locally + Face Rec + MongoDB logging.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key not configured")

    try:
        analysis_text = ""
        identified_people = []
        filepath = None
        filename = None

        # --- CASE 1: Text-Only Query (Memory/RAG) ---
        if not request.image_base64:
            # 1. Search Memory
            memory_context = _search_memory(request.prompt)
            
            # 2. Ask Gemini
            model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
            rag_prompt = (
                "You are a personal visual assistant with access to the user's history.\n"
                f"User Query: {request.prompt}\n\n"
                "RELEVANT MEMORY (from database):\n"
                f"{memory_context}\n\n"
                "Instructions:\n"
                "- Answer the user's question based strictly on the provided memory.\n"
                "- If the answer is found, citation dates/times are helpful.\n"
                "- If not found, say you don't recall seeing that.\n"
                "- Be conversational and helpful."
            )
            response = model.generate_content(rag_prompt)
            analysis_text = response.text
            identified_people = []

        # --- CASE 2: Image Analysis (Existing Logic) ---
        else:
            # 1. Decode and Save Image Locally
            image_data = base64.b64decode(request.image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # KEY FIX: Convert RGBA to RGB for JPEG compatibility
            if image.mode == 'RGBA':
                image = image.convert('RGB')
                
            # --- NEW: Check for Registration Intent ---
            reg_match = re.search(r"^(?:this|that|name|it)\s+is\s+([a-zA-Z0-9_ ]+)$|^register\s+([a-zA-Z0-9_ ]+)$", request.prompt.strip(), re.IGNORECASE)
            if reg_match:
                # Extract name from whichever group matched
                name = reg_match.group(1) or reg_match.group(2)
                name = name.strip()
                
                # Call helper to register
                analysis_text = _register_face_internal(image, name)
                
                return {
                    "response": f"✅ **Registered {name}** successfully.\n\nDescription: {analysis_text}",
                    "identities": [name]
                }
            
            filename = f"{uuid.uuid4()}.jpg"
            filepath = os.path.join("images/uploads", filename)
            image.save(filepath)

            # 2. Face Recognition (Who is this?)
            # OPTIMIZATION: Only run DeepFace if we have registered faces
            has_registered_faces = any(os.path.isdir(os.path.join("images/faces", d)) for d in os.listdir("images/faces"))
            
            if FACE_REC_AVAILABLE and has_registered_faces:
                try:
                    dfs = DeepFace.find(img_path=filepath, db_path="images/faces", model_name="VGG-Face", enforce_detection=False, silent=True)
                    for df in dfs:
                        if not df.empty:
                            paths = df['identity'].values
                            for p in paths:
                                name = os.path.basename(os.path.dirname(p))
                                if name not in identified_people:
                                    identified_people.append(name)
                except Exception as e:
                    print(f"Face Rec Warning: {e}")
            
            # 3. Gemini Analysis (Description / Tags)
            model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
            
            # If we found people, inform Gemini
            context_prompt = request.prompt
            
            # Inject Micro-VLA structure if user asks to "describe"
            if "describe" in request.prompt.lower():
                 context_prompt = (
                     f"{request.prompt}\n\n"
                     "Provide a **bulleted summary (max 30 words)**:\n"
                     "- **People**: " + (", ".join(identified_people) if identified_people else "None") + "\n"
                     "- **Key Details**: \n"
                     "- **Action**: "
                 )
            elif identified_people:
                names_str = ", ".join(identified_people)
                context_prompt = f"The image contains these known people: {names_str}. {request.prompt}"

            response = model.generate_content([context_prompt, image])
            analysis_text = response.text

        # 4. Save to MongoDB (Global History)
        log_entry = {
            "timestamp": datetime.now(),
            "filepath": filepath if request.image_base64 else None,
            "prompt": request.prompt,
            "analysis": analysis_text,
            "identities": identified_people,
        }
        # Insert only if db connection worked
        if 'history_collection' in globals():
             history_collection.insert_one(log_entry)
        
        # 5. Save to Session (Chat History)
        if request.session_id and 'sessions_collection' in globals():
             # Create message objects
             user_msg = {
                 "role": "user", 
                 "content": request.prompt,
                 "image": f"http://localhost:8000/images/uploads/{filename}" if request.image_base64 else None
             }
             assistant_msg = {
                 "role": "assistant",
                 "content": analysis_text
             }
             
             # Update session
             sessions_collection.update_one(
                 {"session_id": request.session_id},
                 {
                     "$push": {"messages": {"$each": [user_msg, assistant_msg]}},
                     "$set": {"timestamp": datetime.now()}, # Update 'last active'
                 }
             )
             
             # Auto-generate title if it's "New Chat" and this is the first real message
             sessions_collection.update_one(
                 {"session_id": request.session_id, "title": "New Chat"},
                 {"$set": {"title": request.prompt[:30] + "..."}}
             )

        return {"response": analysis_text, "identities": identified_people}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register_face")
async def register_face(request: AnalyzeRequest): # Reusing AnalyzeRequest for image+name(in prompt)
    """ 
    Registers a face. 
    Prompt should be the NAME of the person.
    Also runs analysis to index the image for search (e.g. 'blue shirt').
    """
    try:
        name = request.prompt.strip() # In this endpoint, prompt is the name
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")

        # Decode
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # KEY FIX: Convert RGBA to RGB for JPEG compatibility
        if image.mode == 'RGBA':
            image = image.convert('RGB')

        # Create folder for person
        person_dir = os.path.join("images/faces", name)
        os.makedirs(person_dir, exist_ok=True)

        # Save image for Face Rec training
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join(person_dir, filename)
        image.save(filepath)
        
        # Also copy to uploads for history/display
        history_filename = f"{uuid.uuid4()}.jpg"
        history_filepath = os.path.join("images/uploads", history_filename)
        image.save(history_filepath)

        # Remove the pickle file to force DeepFace to re-scan the DB next time
        pkl_path = os.path.join("images/faces", "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
            
        # --- Run Gemini Analysis for Metadata ---
        model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
        analysis_prompt = f"Describe the appearance of this person named {name}. Include details about clothing, colors, and accessories."
        response = model.generate_content([analysis_prompt, image])
        analysis_text = response.text
        
        # Save to MongoDB History
        log_entry = {
            "timestamp": datetime.now(),
            "filepath": history_filepath,
            "prompt": f"Register Face: {name}",
            "analysis": analysis_text,
            "identities": [name], 
            "type": "registration"
        }
        if 'history_collection' in globals():
            history_collection.insert_one(log_entry)

        return {
            "status": "success", 
            "message": f"Registered {name} and indexed appearance.",
            "analysis": analysis_text
        }

    except Exception as e:
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=str(e))

@app.get("/identities")
def get_identities():
    """Returns list of known names with image counts"""
    if not os.path.exists("images/faces"):
        return {"identities": []}
    
    names = [d for d in os.listdir("images/faces") if os.path.isdir(os.path.join("images/faces", d))]
    
    identities_with_counts = []
    
    if 'history_collection' in globals():
        for name in names:
            count = history_collection.count_documents({"identities": name})
            identities_with_counts.append({"name": name, "count": count})
    else:
        # Fallback if DB not connected
        identities_with_counts = [{"name": n, "count": 0} for n in names]
        
    return {"identities": identities_with_counts}

@app.get("/history")
def get_history(name: Optional[str] = None, search: Optional[str] = None):
    """Get history, optionally filtered by name and search query"""
    query = {}
    if name:
        query["identities"] = name
    
    if search:
        # Multi-term search (AND logic)
        # e.g. "tom blue" -> (tom in prompt/analysis/identities) AND (blue in prompt/analysis/identities)
        terms = search.split()
        and_conditions = []
        for term in terms:
            regex_pattern = {"$regex": term, "$options": "i"}
            term_condition = {
                "$or": [
                    {"prompt": regex_pattern},
                    {"analysis": regex_pattern},
                    {"identities": regex_pattern}
                ]
            }
            and_conditions.append(term_condition)
        
        if and_conditions:
            query["$and"] = and_conditions
    
    # Sort by new
    try:
        if 'history_collection' in globals():
            cursor = history_collection.find(query).sort("timestamp", -1).limit(50)
            
            results = []
            for doc in cursor:
                doc["_id"] = str(doc["_id"]) # ObjectId to str
                results.append(doc)
            return {"history": results}
        else:
             return {"history": []}
    except Exception as e:
        print(f"Error fetching history: {e}")
        return {"history": []}

@app.post("/zoom")
async def zoom_image(request: ZoomRequest):
    """
    Uses the local object detection model to find and crop an object.
    Returns the cropped image in base64.
    """
    try:
        import tempfile
        
        # Decode image to save
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # KEY FIX: Convert RGBA to RGB
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            image.save(tmp.name, "JPEG")
            tmp_path = tmp.name
            
        try:
            result_mcp_image = zoom_to_object(tmp_path, request.label)
            
            if result_mcp_image is None:
                return {"found": False, "message": "Object not found"}
                
            # result_mcp_image.data is bytes
            cropped_base64 = base64.b64encode(result_mcp_image.data).decode('utf-8')
            
            return {
                "found": True, 
                "cropped_image": cropped_base64,
                "format": result_mcp_image.format
            }
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
