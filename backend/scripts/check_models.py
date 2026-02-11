
#!/usr/bin/env python3
"""
Check available models and their status
"""

import os
import sys

# Add the parent directory to the path to import from config
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Change to backend directory to ensure we're in the right context
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.settings import settings
import google.generativeai as genai

def main():
    """Check model availability"""
    print("=== MCP Vision Model Status ===")
    
    # Check Gemini API Key
    if settings.GEMINI_API_KEY:
        print("✅ Gemini API Key: Found")
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            models = genai.list_models()
            gemini_models = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
            
            # Write to models.txt
            output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "models.txt")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write("Available Gemini Models:\n")
                for model in gemini_models:
                    f.write(f"{model}\n")
            
            print(f"✅ Available Gemini Models: {len(gemini_models)}")
            for model in gemini_models[:5]:  # Show first 5
                print(f"  - {model}")
            print(f"📝 Models saved to: {output_path}")
            
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
            # Write error to models.txt
            output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "models.txt")
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(f"Error listing models: {e}")
    else:
        print("❌ Gemini API Key: Not found")
        output_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "models.txt")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("Error: GEMINI_API_KEY not found in environment variables")
    
    # Check MongoDB
    try:
        from pymongo import MongoClient
        client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
        client.server_info()
        print(f"✅ MongoDB: Connected ({settings.MONGO_URI})")
    except Exception as e:
        print(f"❌ MongoDB: {e}")
    
    # Check DeepFace
    try:
        from deepface import DeepFace
        print("✅ DeepFace: Available")
    except Exception as e:
        print(f"❌ DeepFace: {e}")
    
    # Check TensorFlow
    try:
        import tensorflow as tf
        print(f"✅ TensorFlow: {tf.__version__}")
    except Exception as e:
        print(f"❌ TensorFlow: {e}")

if __name__ == "__main__":
    main()
