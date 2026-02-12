import os
import glob
from deepface import DeepFace
import cv2
import pandas as pd
import sys

# Config matches settings.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "images")
UPLOADS_DIR = os.path.join(IMAGES_DIR, "uploads")
FACES_DIR = os.path.join(IMAGES_DIR, "faces")

def get_latest_image(dir_path):
    files = glob.glob(os.path.join(dir_path, "*.jpg"))
    if not files:
        return None
    return max(files, key=os.path.getctime)

def analyze_misidentification():
    latest_img = get_latest_image(UPLOADS_DIR)
    if not latest_img:
        print("No images found.")
        return

    print(f"Analyzing latest image: {os.path.basename(latest_img)}")
    
    try:
        # Run DeepFace with loose threshold to see ALL candidates
        dfs = DeepFace.find(
            img_path=latest_img, 
            db_path=FACES_DIR, 
            model_name="Facenet512", 
            distance_metric="cosine",
            detector_backend="retinaface",
            align=True,
            enforce_detection=False, 
            threshold=1.0, # Show everything
            silent=True
        )
        
        for i, df in enumerate(dfs):
            print(f"\n--- Face {i} Candidates ---")
            
            if df.empty:
                 print("  No matches found (DF Empty).")
                 continue

            # Print all rows
            for index, row in df.iterrows():
                distance = row['distance']
                identity = row['identity']
                name = os.path.basename(os.path.dirname(identity))
                
                source_w = int(row.get('source_w', 0))
                source_h = int(row.get('source_h', 0))
                face_size = max(source_w, source_h)
                
                # Check what threshold WOULD be applied
                if face_size < 250:
                    dynamic_threshold = 0.50
                    desc = "Small/Far"
                else:
                    dynamic_threshold = 0.40
                    desc = "Large/Close"
                
                print(f"  Candidate: {name:<10} | Dist: {distance:.4f} | Size: {face_size}px | Thresh: {dynamic_threshold}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    with open("analysis_result.txt", "w", encoding="utf-8") as f:
        original_stdout = sys.stdout
        sys.stdout = f
        analyze_misidentification()
        sys.stdout = original_stdout
    
    print("Analysis complete. Check analysis_result.txt")
