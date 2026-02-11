from pymongo import MongoClient
import os
from config.settings import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
history = db["history"]

print("--- Fixing Filepaths (Force Update) ---")
count = 0

# We want everything to look like "images\uploads\uuid.jpg"
target_dir = os.path.join("images", "uploads")

for doc in history.find():
    fp = doc.get('filepath')
    if fp:
        filename = os.path.basename(fp)
        new_fp = os.path.join(target_dir, filename)
        
        if fp != new_fp:
            print(f"Fixing: {fp} -> {new_fp}")
            history.update_one({"_id": doc["_id"]}, {"$set": {"filepath": new_fp}})
            count += 1
        else:
             print(f"Skipping (already correct): {fp}")

print(f"Update Complete. Fixed {count} documents.")
