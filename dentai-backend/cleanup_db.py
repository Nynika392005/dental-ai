import os
import re
import pymongo
from pymongo import MongoClient

def cleanup():
    # Read MONGODB_URL from environment or use local default
    mongo_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017/dentai")
    
    # Extract database name from connection string if present
    db_name = "dentai"
    if "/" in mongo_url.replace("://", ""):
        parts = mongo_url.split("/")
        if "?" in parts[-1]:
            db_name = parts[-1].split("?")[0] or "dentai"
        elif parts[-1]:
            db_name = parts[-1] or "dentai"
            
    print(f"Connecting to MongoDB database '{db_name}'...")
    try:
        client = MongoClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client[db_name]
        # Force connection check
        client.server_info()
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return
        
    clinics = list(db["clinics"].find({}))
    print(f"Found {len(clinics)} total clinics.")
    
    seen = {}
    duplicates_to_delete = []
    
    for clinic in clinics:
        name = clinic.get("name", "").strip()
        name_clean = re.sub(r'\s+\d+$', '', name).strip()
        address = clinic.get("address", "").strip()
        key = (name_clean.lower(), address.lower())
        
        if key in seen:
            keep_id = seen[key]
            old_id = clinic["_id"]
            duplicates_to_delete.append(old_id)
            
            # Update dentists referencing this duplicate
            res_d = db["dentists"].update_many({"clinic_id": old_id}, {"$set": {"clinic_id": keep_id}})
            # Update appointments referencing this duplicate
            res_a = db["appointments"].update_many({"clinic_id": old_id}, {"$set": {"clinic_id": keep_id}})
            
            print(f"Merged duplicate clinic '{name}' ({old_id} -> {keep_id}). Dentists updated: {res_d.modified_count}, Appointments updated: {res_a.modified_count}")
        else:
            seen[key] = clinic["_id"]
            
    if duplicates_to_delete:
        res = db["clinics"].delete_many({"_id": {"$in": duplicates_to_delete}})
        print(f"Successfully deleted {res.deleted_count} duplicate clinic records.")
    else:
        print("No duplicate clinics found.")
        
    print("Database cleanup completed successfully!")

if __name__ == "__main__":
    cleanup()
