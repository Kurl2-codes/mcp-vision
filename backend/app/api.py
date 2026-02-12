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
from PIL import Image
import google.generativeai as genai
from pymongo import MongoClient
# Import configuration
from config.settings import settings

# Import existing MCP tools
from core.server import locate_objects, zoom_to_object, init_objdet_pipeline
from core.utils import pil_to_base64

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
os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
os.makedirs(settings.FACES_DIR, exist_ok=True)
app.mount("/images", StaticFiles(directory=settings.IMAGES_DIR), name="images")
# Mount faces directory for verification UI (reference images)
app.mount("/images/faces", StaticFiles(directory=settings.FACES_DIR), name="faces")

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY not found in environment variables.")

# MongoDB Setup
try:
    client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
    db = client[settings.MONGO_DB_NAME]
    history_collection = db["history"]
    faces_collection = db["faces"]
    sessions_collection = db["sessions"]
    print("Connected to MongoDB.")
except Exception as e:
    print(f"Warning: Could not connect to MongoDB: {e}")

def _register_face_internal(image: Image.Image, name: str) -> str:
    """
    Internal helper to save face image, clear pickle, and return a description.
    """
    # Lazy import DeepFace to check availability (not strictly needed for registration but good for consistency)
    # Lazy import DeepFace to check availability (not strictly needed for registration but good for consistency)
    try:
        from deepface import DeepFace
    except ImportError:
        print("WARNING: DeepFace not installed.")

    # Create folder for person
    person_dir = os.path.join(settings.FACES_DIR, name)
    os.makedirs(person_dir, exist_ok=True)

    # Save image for Face Rec training
    filepath = os.path.join(person_dir, f"{uuid.uuid4()}.jpg")
    image.save(filepath)
    
    # Also copy to uploads for history/display
    history_filename = f"{uuid.uuid4()}.jpg"
    history_filepath = os.path.join(settings.UPLOADS_DIR, history_filename)
    image.save(history_filepath)

    # Remove the pickle file to force DeepFace to re-scan the DB next time
    pkl_path = os.path.join(settings.FACES_DIR, "representations_vgg_face.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
        
    # --- Run Gemini Analysis for Metadata ---
    if settings.GEMINI_API_KEY:
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
    skip_faces: bool = False # New flag for "Describe Only" mode
    detailed_analysis: bool = False # Default to False to prevent accidental API key errors

class ZoomRequest(BaseModel):
    image_base64: str
    label: str
    session_id: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MCP Vision API is running"}

@app.post("/login")
async def login(request: LoginRequest):
    # Hardcoded for now, could be in .env or DB
    if request.username == "admin" and request.password == "admin123":
        return {"status": "success", "user": {"name": "Karl Silva", "role": "Pro User"}}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/questionnaire")
async def process_questionnaire(request: AnalyzeRequest):
    """
    Process the full VLA questionnaire in a single batch request.
    Uses Gemini 1.5 Flash (Lowest Cost).
    """
    if not settings.GEMINI_API_KEY:
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
async def get_session(session_id: str):
    """Retrieve history for a specific session"""
    if 'sessions_collection' not in globals():
        raise HTTPException(status_code=500, detail="Database not connected")
        
    session = sessions_collection.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and its history"""
    if 'sessions_collection' not in globals():
        raise HTTPException(status_code=500, detail="Database not connected")
    
    result = sessions_collection.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {"status": "success", "message": f"Session {session_id} deleted"}

@app.post("/analyze")
async def analyze_image(request: AnalyzeRequest):
    """
    Analyzes an image using Gemini Flash locally + Face Rec + MongoDB logging.
    """
    # REMOVED: if not settings.GEMINI_API_KEY: raise ... (Allow offline flow)

    try:
        analysis_text = ""
        identified_people = []
        filepath = None
        filename = None

        # --- CASE 1: Text-Only Query (Memory/RAG) ---
        if not request.image_base64:
            # 1. Search Memory
            memory_context = _search_memory(request.prompt)
            
            if not settings.GEMINI_API_KEY:
                 if memory_context:
                      return {"response": f"**Offline Search Results**:\n\n{memory_context}", "matches": []}
                 else:
                      return {"response": "Offline Mode: No matching memories found for your query.", "matches": []}

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
            filepath = os.path.join(settings.UPLOADS_DIR, filename)
            image.save(filepath)

            print(f"DEBUG: prompt='{request.prompt}', detailed={request.detailed_analysis}, skip={request.skip_faces}, key={bool(settings.GEMINI_API_KEY)}")

            # 2. Face Recognition (Who is this?)
            matches = [] # Initialize here to prevent UnboundLocalError
            
            # OPTIMIZATION: Only run DeepFace if we have registered faces AND if not skipped
            has_registered_faces = any(os.path.isdir(os.path.join(settings.FACES_DIR, d)) for d in os.listdir(settings.FACES_DIR))
            
            if has_registered_faces and not request.skip_faces:
                try:
                    from deepface import DeepFace
                    # Switch to 'retinaface' for MAXIMUM accuracy and 'Facenet512' for robust recognition
                    # Threshold for Facenet512 (Cosine) relaxed to 0.40 to catch valid faces like Ron 
                    # while typically avoiding the gross errors seen with VGG-Face at 0.60
                    dfs = DeepFace.find(
                        img_path=filepath, 
                        db_path=settings.FACES_DIR, 
                        model_name="Facenet512", 
                        distance_metric="cosine",
                        detector_backend="retinaface", 
                        enforce_detection=False, 
                        threshold=0.5, # Explicitly loosen internal filter so we can filter manually
                        silent=True
                    )
                    
                    total_faces_detected = len(dfs)
                    print(f"DEBUG: DeepFace (RetinaFace/Facenet512) detected {total_faces_detected} faces.")

                    for i, df in enumerate(dfs):
                        print(f"DEBUG: Processing Face {i}...")
                        if not df.empty:
                            print(f"DEBUG: Face {i} has {len(df)} potential matches.")
                            # Iterate through DataFrame rows for this specific detected face
                            # Find the first entry that meets the threshold (0.60)
                            for index, row in df.iterrows():
                                    identity_path = row['identity']
                                    name = os.path.basename(os.path.dirname(identity_path))
                                    distance = row.get('distance', 1.0)
                                    
                                    source_x = int(row.get('source_x', 0))
                                    source_y = int(row.get('source_y', 0))
                                    source_w = int(row.get('source_w', 0))
                                    source_h = int(row.get('source_h', 0))
                                    
                                    # ACCURACY FIX: Ignore detections that are too small (likely texture noise)
                                    # Increased to 50x50 to filter out blurry blobs
                                    if source_w < 50 or source_h < 50:
                                        print(f"DEBUG: Skipping match for {name} ({distance:.4f}) due to small detection size ({source_w}x{source_h})")
                                        continue

                                    # Set threshold to 0.35 to filter out false positives.
                                    # ACCURACY FIX: 0.35 is the "Sweet Spot"
                                    # - Captures Ron (Distance 0.32)
                                    # - Rejects false Wally (Distance ~0.37)
                                    if distance < 0.35: 
                                        confidence = max(0, min(100, (1 - distance) * 100))
                                        
                                        # CROP THE FACE FOR VERIFICATION
                                        face_crop_base64 = None
                                        try:
                                            # Crop: (left, top, right, bottom)
                                            crop_box = (source_x, source_y, source_x + source_w, source_y + source_h)
                                            face_img = image.crop(crop_box)
                                            face_crop_base64 = pil_to_base64(face_img)
                                        except Exception as crop_err:
                                            print(f"DEBUG: Failed to crop face {i}: {crop_err}")

                                        ref_filename = os.path.basename(identity_path)
                                        reference_url = f"http://localhost:8000/images/faces/{name}/{ref_filename}"

                                        if name not in identified_people:
                                            identified_people.append(name)
                                        
                                        # --- ADAPTIVE LEARNING ---
                                        # If match is very strong (e.g. < 0.25), auto-save this new crop as a reference
                                        # to help the model learn new angles/aging/makeup over time.
                                        if distance < 0.25:
                                            try:
                                                person_dir = os.path.dirname(identity_path)
                                                # Limit total reference images to 15 to prevent bloat
                                                if len(os.listdir(person_dir)) < 15:
                                                    new_ref_filename = f"auto_{uuid.uuid4()}.jpg"
                                                    new_ref_path = os.path.join(person_dir, new_ref_filename)
                                                    face_img.save(new_ref_path)
                                                    print(f"DEBUG: Adaptive Learning - Saved new reference for {name} ({distance:.4f})")
                                            except Exception as save_err:
                                                print(f"DEBUG: Adaptive Learning failed: {save_err}")
                                            
                                        matches.append({
                                            "name": name,
                                            "box": {"x": source_x, "y": source_y, "w": source_w, "h": source_h},
                                            "confidence": f"{confidence:.1f}%",
                                            "reference_image": reference_url,
                                            "face_crop": face_crop_base64 # Send back the crop!
                                        })
                                        break # Take the best match for this face and move to next detected face
                            else:
                                # If loop finishes without break, no match met the threshold
                                # But we still want to show the detected face as "Unknown"
                                if not df.empty:
                                    # Get the box from the first row (the detection itself is valid)
                                    first_row = df.iloc[0]
                                    source_x = int(first_row.get('source_x', 0))
                                    source_y = int(first_row.get('source_y', 0))
                                    source_w = int(first_row.get('source_w', 0))
                                    source_h = int(first_row.get('source_h', 0))
                                    
                                    # Only show if it passes the size filter
                                    if source_w >= 50 and source_h >= 50:
                                        matches.append({
                                            "name": "Unknown",
                                            "box": {"x": source_x, "y": source_y, "w": source_w, "h": source_h},
                                            "confidence": "0%",
                                            "reference_image": None,
                                            "face_crop": None 
                                        })
                                print(f"DEBUG: Face {i} detected but no match met the distance threshold (Best: {df.iloc[0]['distance'] if not df.empty else 'N/A'})")
                        else:
                            print(f"DEBUG: Face {i} detected but no match found in database.")

                except Exception as e:
                    print(f"Face Rec Warning: {e}")
                    traceback.print_exc()
            
            # Check for PROMPT content (strip whitespace handling)
            has_prompt = request.prompt and request.prompt.strip()

            # 3. Gemini Analysis (Description / Tags)
            # Only run if detailed_analysis is True OR if we found people (to contextually link them) 
            # OR if skip_faces is True (Vision Mode always gets analysis)
            if (request.detailed_analysis or request.skip_faces) and settings.GEMINI_API_KEY:
                model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
                
                # If we found people, inform Gemini
                context_prompt = request.prompt or "Describe this image."
                
                # Inject Micro-VLA structure if user asks to "describe"
                if request.prompt and "describe" in request.prompt.lower():
                     context_prompt = (
                         f"{request.prompt}\n\n"
                         "Provide a **bulleted summary (max 30 words)**:\n"
                         "- **People**: " + (", ".join(identified_people) if identified_people else "None") + "\n"
                         "- **Key Details**: \n"
                         "- **Action**: "
                     )
                elif identified_people:
                    names_str = ", ".join(identified_people)
                    user_instruction = request.prompt
                    if not user_instruction or not user_instruction.strip():
                        user_instruction = "Describe this image."
                    context_prompt = f"The image contains these known people: {names_str}. {user_instruction}"

                try:
                    response = model.generate_content([context_prompt, image])
                    analysis_text = response.text
                except Exception as g_err:
                    print(f"Gemini Error: {g_err}")
                    analysis_text = "AI Analysis Failed (Check Server Logs)"

            elif not settings.GEMINI_API_KEY and (request.detailed_analysis or has_prompt):
                 # User asked for analysis but no key provided
                 if request.skip_faces:
                      # Vision Mode (skip_faces=True) relies 100% on Gemini.
                      analysis_text = "Vision Mode requires Gemini API Key. Switch to Memory Mode for Face Recognition."
                 elif identified_people:
                      # If we found faces, just report them. Don't nag the user about the key.
                      analysis_text = f"Identified: {', '.join(identified_people)}"
                 else:
                      analysis_text = "No known faces found. (AI Analysis skipped - missing key)."
            else:
                # FAST PATH: No Gemini Analysis, just identities
                if identified_people:
                    analysis_text = f"Identified: {', '.join(identified_people)}"
                else:
                    analysis_text = "No known faces found."

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

        return {"response": analysis_text, "identities": identified_people, "matches": matches}

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
        person_dir = os.path.join(settings.FACES_DIR, name)
        os.makedirs(person_dir, exist_ok=True)

        # Save image for Face Rec training
        filepath = os.path.join(person_dir, f"{uuid.uuid4()}.jpg")
        image.save(filepath)
        
        # Also copy to uploads for history/display
        history_filename = f"{uuid.uuid4()}.jpg"
        history_filepath = os.path.join(settings.UPLOADS_DIR, history_filename)
        image.save(history_filepath)

        # Remove the pickle file to force DeepFace to re-scan the DB next time
        pkl_path = os.path.join(settings.FACES_DIR, "representations_vgg_face.pkl")
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
            
        # --- Run Gemini Analysis for Metadata ---
        if settings.GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
                analysis_prompt = f"Describe the appearance of this person named {name}. Include details about clothing, colors, and accessories."
                response = model.generate_content([analysis_prompt, image])
                analysis_text = response.text
            except Exception as g_err:
                print(f"Gemini Error during registration: {g_err}")
                analysis_text = "Analysis unavailable (Gemini Error)"
        else:
             analysis_text = "Analysis unavailable (Offline/No API Key)"
        
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
            "message": f"Registered {name}.",
            "analysis": analysis_text
        }

    except Exception as e:
         traceback.print_exc()
         raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_upload")
async def batch_upload(
    file: UploadFile = File(...),
    run_analysis: bool = True # Default to True, but frontend can toggle
):
    """
    Handles bulk import of images.
    1. Saves image locally.
    2. Runs DeepFace (Local/Free) to tag identities.
    3. OPTIONAL: Runs Gemini (Cloud/Cost) to describe clothing/actions.
    4. Saves context to MongoDB.
    """
    try:
        # 1. Save File
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join(settings.UPLOADS_DIR, filename)
        
        # Read and save (Handle generic uploads)
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        image.save(filepath)
        
        # 2. DeepFace (Local Face Rec) - Always run
        identified_people = []
        # Check if faces dir has any folders
        has_registered_faces = any(os.path.isdir(os.path.join(settings.FACES_DIR, d)) for d in os.listdir(settings.FACES_DIR))
        
        if has_registered_faces:
            try:
                from deepface import DeepFace
                # Run find with explicit opencv backend and multiple results handling
                dfs = DeepFace.find(
                    img_path=filepath, 
                    db_path=settings.FACES_DIR, 
                    model_name="VGG-Face", 
                    detector_backend="mtcnn",
                    enforce_detection=False, 
                    silent=True
                )
                for df in dfs:
                    if not df.empty:
                        # Iterate through results to find match within threshold
                        for index, row in df.iterrows():
                            distance = row.get('distance', 1.0)
                            if distance < 0.60: # Consistent threshold (0.60)
                                identity_path = row['identity']
                                name = os.path.basename(os.path.dirname(identity_path))
                                if name not in identified_people:
                                    identified_people.append(name)
                                break
            except Exception as e:
                print(f"DeepFace Warning: {e}")

        # 3. Gemini (Deep Scan) - Optional
        analysis_text = ""
        if run_analysis and settings.GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-2.0-flash-lite-001')
                
                prompt = "Describe this image efficiently. Focus on: 1) Who is it (gender/age)? 2) Clothing colors/style. 3) Action/Context. Keep it under 40 words."
                if identified_people:
                    prompt = f"This is {', '.join(identified_people)}. {prompt}"
                
                response = model.generate_content([prompt, image])
                analysis_text = response.text
            except Exception as e:
                print(f"Gemini Warning: {e}")
                analysis_text = "Analysis skipped or failed."
        else:
            analysis_text = "Imported Image (No Deep Scan)"

        # 4. Save to DB
        log_entry = {
            "timestamp": datetime.now(),
            "filepath": filepath,
            "prompt": "Batch Import",
            "analysis": analysis_text,
            "identities": identified_people,
            "type": "import"
        }
        
        if 'history_collection' in globals():
            history_collection.insert_one(log_entry)

        return {
            "filename": filename,
            "identities": identified_people,
            "analysis": analysis_text
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/identities")
def get_identities():
    """Returns list of known names with image counts"""
    if not os.path.exists(settings.FACES_DIR):
        return {"identities": []}
    
    names = [d for d in os.listdir(settings.FACES_DIR) if os.path.isdir(os.path.join(settings.FACES_DIR, d))]
    
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
            
            # --- PERSISTENCE LOGIC ---
            # Save zoomed image so it survives refreshes
            zoom_filename = f"zoom_{uuid.uuid4()}.jpg"
            zoom_filepath = os.path.join(settings.UPLOADS_DIR, zoom_filename)
            with open(zoom_filepath, "wb") as f:
                f.write(result_mcp_image.data)
            
            zoom_url = f"http://localhost:8000/images/uploads/{zoom_filename}"

            if request.session_id and 'sessions_collection' in globals():
                zoom_msg = {
                    "role": "assistant",
                    "content": f"🔍 Zoomed in on **{request.label}**",
                    "image": zoom_url,
                    "timestamp": datetime.now().isoformat()
                }
                sessions_collection.update_one(
                    {"session_id": request.session_id},
                    {"$push": {"messages": zoom_msg}}
                )

            return {
                "found": True, 
                "cropped_image": cropped_base64,
                "format": result_mcp_image.format,
                "url": zoom_url
            }
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/images/{filename}")
async def delete_image(filename: str):
    """
    Deletes an image from storage and history.
    """
    try:
        # 1. Delete file from uploads
        filepath = os.path.join(settings.UPLOADS_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            
        # 2. Delete from MongoDB History
        if 'history_collection' in globals():
            result = history_collection.delete_one({"filepath": filepath})
            if result.deleted_count == 0:
                # Try partial match if absolute path differs
                history_collection.delete_one({"filepath": {"$regex": filename}})

        return {"status": "success", "message": f"Deleted {filename}"}

    except Exception as e:
        print(f"Error deleting image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
