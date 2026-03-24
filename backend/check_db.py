import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
client = MongoClient(os.getenv('MONGO_URI'))
db = client['PCOSdb']

print("=== USERS IN DATABASE ===")
users = list(db['users'].find({}, {"_id": 0, "password": 0})) # Don't print passwords or ObjectIDs for clarity
for u in users:
    print(u)

print("\n=== HEALTH RECORDS IN DATABASE ===")
records = list(db['health_records'].find({}, {"_id": 0}))
if not records:
    print("No health records yet.")
for r in records:
    print(r)
