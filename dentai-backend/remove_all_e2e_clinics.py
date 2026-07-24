"""
Remove ALL E2E Selenium test clinics from database
"""
import asyncio
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

def _parse_db_name(url: str) -> str:
    """Extract database name from MongoDB URL"""
    try:
        path = urlparse(url).path
        name = path.lstrip('/')
        return name if name else "dentai"
    except Exception:
        return "dentai"

async def remove_all_e2e_clinics():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_name = _parse_db_name(settings.MONGODB_URL)
    db = client[db_name]
    
    print("🔍 Searching for ALL E2E test clinics...")
    print()
    
    removed_clinics = []
    removed_dentists = 0
    removed_appointments = 0
    
    # Find ALL clinics with "E2E" or "e2e" in the name
    clinic_cursor = db["clinics"].find({
        "name": {"$regex": "e2e", "$options": "i"}
    })
    
    async for clinic_doc in clinic_cursor:
        clinic_id = clinic_doc["_id"]
        clinic_display_name = clinic_doc.get("name", "Unknown")
        
        print(f"📍 Found E2E clinic: {clinic_display_name}")
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
    print(f"✅ E2E Clinics removed: {len(removed_clinics)}")
    print(f"✅ Dentists removed: {removed_dentists}")
    print(f"✅ Appointments removed: {removed_appointments}")
    print()
    
    if not removed_clinics:
        print("⚠️  No E2E test clinics found in the database")
    else:
        print("✨ All E2E test clinics cleaned up successfully!")
        print()
        print("📋 Now checking remaining clinics...")
        
        # Show remaining clinics
        remaining_cursor = db["clinics"].find({})
        remaining_count = 0
        async for clinic in remaining_cursor:
            remaining_count += 1
            print(f"   {remaining_count}. {clinic.get('name', 'Unknown')}")
        
        if remaining_count == 0:
            print("   ℹ️  No clinics remaining - register new dentist accounts to create clinics")
        else:
            print(f"\n✅ {remaining_count} real clinic(s) remaining in database")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(remove_all_e2e_clinics())
