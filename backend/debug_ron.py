import os
from deepface import DeepFace
from config.settings import settings

# Path to the reference image of Ron
ron_ref = os.path.join(settings.FACES_DIR, "ron", "a72426db-ebb5-4a3f-9169-3447c0f20e69.jpg")

# Path to the test image (Harry Potter group photo)
# I need to find the latest uploaded image which likely contains the group photo
uploads_dir = settings.UPLOADS_DIR
uploaded_files = [os.path.join(uploads_dir, f) for f in os.listdir(uploads_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
if not uploaded_files:
    print("No uploaded images found to test against.")
    exit()

# Get the most recent file
test_image = max(uploaded_files, key=os.path.getctime)
print(f"Testing against latest upload: {test_image}")

try:
    # force detection to find all faces in the group photo
    # and compare against Ron's reference
    result = DeepFace.verify(
        img1_path=test_image,
        img2_path=ron_ref,
        model_name="Facenet512",
        detector_backend="retinaface",
        distance_metric="cosine",
        enforce_detection=False
    )
    
    print("\n--- Verification Result for Ron ---")
    print(f"Verified: {result['verified']}")
    print(f"Distance: {result['distance']}")
    print(f"Threshold: {result['threshold']}")
    print(f"Model: {result['model']}")
    print(f"Similarity Metric: {result['similarity_metric']}")

except Exception as e:
    print(f"Error: {e}")
