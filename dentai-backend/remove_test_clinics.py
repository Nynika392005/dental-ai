"""
Remove specific test clinics and their associated data
"""
import asyncio
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

# List of clinic names to remove (exact matches, case-insensitive)
CLINICS_TO_REMOVE = [
    "123.rnd",
    "123.rknd",
    "fahajja",
    "nynika clinic",
    "nynika clinic ",  # with trailing space
    "nynika clinic poonammale",
    "serenal denal studio",
    "serena dental studio",  # corrected spelling
    "saveetha dental hospital",
    "saveetha hospital"
]

def _parse_db_name(url: str) -> str:
    """Extract database name from MongoDB URL"""
    try:
        path = urlparse(url).path
        name = path.lstrip('/')
        return name if name else "dentai"
    except Exception:
        return "dentai"

async def remove_test_clinics():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_name = _parse_db_name(settings.MONGODB_URL)
    db = client[db_name]
    
    print("🔍 Searching for test clinics to remove...")
    print(f"   Target clinics: {', '.join(CLINICS_TO_REMOVE)}")
    print()
    
    removed_clinics = []
    removed_dentists = 0
    removed_appointments = 0
    
    # Find and remove clinics (case-insensitive search)
    for clinic_name in CLINICS_TO_REMOVE:
        # Find clinic (case-insensitive)
        clinic_cursor = db["clinics"].find({
            "name": {"$regex": f"^{clinic_name}$", "$options": "i"}
        })
        
        async for clinic_doc in clinic_cursor:
            clinic_id = clinic_doc["_id"]
            clinic_display_name = clinic_doc.get("name", "Unknown")
            
            print(f"📍 Found clinic: {clinic_display_name}")
            print(f"   ID: {clinic_id}")
            
            # Remove dentists associated with this clinic
            dentists_cursor = db["dentists"].find({"clinic_id": clinic_id})
            dentist_ids = []
            async for dentist_doc in dentists_cursor:
                dentist_ids.append(dentist_doc["_id"])
            
            if dentist_ids:
                result = await db["dentists"].delete_many({"clinic_id": clinic_id})
                removed_dentists += result.deleted_count
                print(f"   ✅ Removed {result.deleted_count} dentist(s)")
            
            # Remove appointments associated with this clinic
            result = await db["appointments"].delete_many({"clinic_id": clinic_id})
            removed_appointments += result.deleted_count
            if result.deleted_count > 0:
                print(f"   ✅ Removed {result.deleted_count} appointment(s)")
            
            # Remove the clinic itself
            await db["clinics"].delete_one({"_id": clinic_id})
            removed_clinics.append(clinic_display_name)
            print(f"   ✅ Removed clinic: {clinic_display_name}")
            print()
    
    # Summary
    print("=" * 60)
    print("📊 REMOVAL SUMMARY")
    print("=" * 60)
    print(f"✅ Clinics removed: {len(removed_clinics)}")
    if removed_clinics:
        for clinic in removed_clinics:
            print(f"   - {clinic}")
    print(f"✅ Dentists removed: {removed_dentists}")
    print(f"✅ Appointments removed: {removed_appointments}")
    print()
    
    if not removed_clinics:
        print("⚠️  No matching clinics found in the database")
    else:
        print("✨ Cleanup completed successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(remove_test_clinics())
