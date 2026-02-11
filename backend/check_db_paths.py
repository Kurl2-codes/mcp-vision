from pymongo import MongoClient
import os
from config.settings import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.MONGO_DB_NAME]
history = db["history"]

print(f"Total History Documents: {history.count_documents({})}")
print("--- Sample Filepaths ---")
for doc in history.find().sort("timestamp", -1).limit(5):
    fp = doc.get('filepath')
    print(f"ID: {doc.get('_id')} | Filepath Type: {type(fp)} | Value: '{fp}'")
