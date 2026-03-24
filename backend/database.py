from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)

db = client["PCOSdb"]

predictions_collection = db["predictions"]
users_collection = db["users"]
health_records_collection = db["health_records"]

# Export client for graceful shutdown
__all__ = ["client", "predictions_collection", "users_collection", "health_records_collection"]

periods_collection = db["period_logs"]