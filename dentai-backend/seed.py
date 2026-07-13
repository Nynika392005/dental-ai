import asyncio
import uuid
import enum
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.models.education import Article, ArticleCategory, OralHealthTip
from app.models.user import Clinic, Dentist, User, RoleEnum
from app.core.security import get_password_hash

async def seed_mongodb_data(db):
    # Add Oral Health Tips if empty
    tip_count = await db["oral_health_tips"].count_documents({})
    if tip_count == 0:
        tips = [
            OralHealthTip(tip_text="Brush your teeth twice a day for two minutes each time.", category="hygiene"),
            OralHealthTip(tip_text="Don't forget to brush your tongue to remove bacteria and freshen your breath.", category="hygiene"),
            OralHealthTip(tip_text="Floss daily to remove plaque from between your teeth where your toothbrush can't reach.", category="hygiene"),
            OralHealthTip(tip_text="Replace your toothbrush every three to four months, or sooner if the bristles are frayed.", category="hygiene"),
            OralHealthTip(tip_text="Limit sugary snacks and drinks to prevent tooth decay.", category="nutrition"),
            OralHealthTip(tip_text="Drink plenty of water, especially after meals, to help wash away food particles.", category="nutrition"),
            OralHealthTip(tip_text="Visit your dentist regularly for professional cleanings and checkups.", category="routine")
        ]
        await db["oral_health_tips"].insert_many([t.to_dict() for t in tips])
        print("Added oral health tips.")
        
    # Add Clinics and Dentists if empty
    clinic_count = await db["clinics"].count_documents({})
    if clinic_count == 0:
        c1_id = uuid.uuid4()
        c2_id = uuid.uuid4()
        clinics = [
            Clinic(id=c1_id, name="Pearl Dental Clinic", address="123 Care Street, Medical District", phone="555-0101"),
            Clinic(id=c2_id, name="Smile Center", address="456 Bright Avenue, Downtown", phone="555-0202")
        ]
        await db["clinics"].insert_many([c.to_dict() for c in clinics])
        
        # Add dentist users
        u1_id = uuid.uuid4()
        u2_id = uuid.uuid4()
        dentist_users = [
            User(
                id=u1_id,
                full_name="Dr. Sarah Smith", 
                email="sarah.smith@dentai.com", 
                phone="555-1111", 
                password_hash=get_password_hash("fake_hash_for_seed"),
                role=RoleEnum.dentist,
                is_verified=True
            ),
            User(
                id=u2_id,
                full_name="Dr. John Doe", 
                email="john.doe@dentai.com", 
                phone="555-2222", 
                password_hash=get_password_hash("fake_hash_for_seed"),
                role=RoleEnum.dentist,
                is_verified=True
            )
        ]
        await db["users"].insert_many([u.to_dict() for u in dentist_users])
        
        dentists = [
            Dentist(user_id=u1_id, clinic_id=c1_id, specialization="General Dentistry", bio="Expert in restorative and preventive care."),
            Dentist(user_id=u2_id, clinic_id=c2_id, specialization="Orthodontist", bio="Helping you achieve the perfect smile.")
        ]
        await db["dentists"].insert_many([d.to_dict() for d in dentists])
        print("Added clinics and dentists.")

    # Add Articles if empty
    article_count = await db["articles"].count_documents({})
    if article_count == 0:
        articles = [
            Article(
                title="The Importance of Regular Dental Checkups",
                slug="importance-of-checkups",
                content="Regular dental visits are important because they help keep your teeth and gums healthy. You should have a regular dental visit at least every 6 months...",
                category=ArticleCategory.hygiene,
                author="Dr. DentAI",
                is_published=True,
                read_time_minutes=3
            ),
            Article(
                title="How to Prevent Cavities in Children",
                slug="prevent-cavities-children",
                content="Cavities are common in children, but they are preventable. Start good oral hygiene habits early, limit sugar, and use fluoride toothpaste...",
                category=ArticleCategory.children,
                author="Pediatric Specialist",
                is_published=True,
                read_time_minutes=5
            ),
            Article(
                title="What to Do in a Dental Emergency",
                slug="dental-emergency-guide",
                content="A dental emergency can be scary. If you have a knocked-out tooth, severe pain, or heavy bleeding, contact your dentist immediately...",
                category=ArticleCategory.emergency,
                author="Emergency Dentist",
                is_published=True,
                read_time_minutes=4
            ),
            Article(
                title="Understanding Root Canal Treatment",
                slug="root-canal-explained",
                content="A root canal is a treatment used to repair and save a tooth that is badly decayed or becomes infected. During a root canal procedure, the nerve and pulp are removed and the inside of the tooth is cleaned and sealed.",
                category=ArticleCategory.procedures,
                author="Dr. Endodontic",
                is_published=True,
                read_time_minutes=6
            ),
            Article(
                title="Professional Teeth Whitening: What to Expect",
                slug="teeth-whitening-guide",
                content="Professional teeth whitening is a safe and effective way to brighten your smile. Your dentist will apply a bleaching agent to your teeth, which is then activated by a special light.",
                category=ArticleCategory.procedures,
                author="Dr. Cosmetic",
                is_published=True,
                read_time_minutes=4
            ),
            Article(
                title="Dental Crowns: Restoring Your Tooth's Strength",
                slug="dental-crowns-guide",
                content="A dental crown is a tooth-shaped 'cap' that is placed over a tooth to cover it, restoring its shape, size, strength, and appearance. They are often needed when a tooth is cracked, decayed, or has had a root canal.",
                category=ArticleCategory.procedures,
                author="Dr. Restorative",
                is_published=True,
                read_time_minutes=5
            ),
            Article(
                title="Braces and Clear Aligners: The Path to Straighter Teeth",
                slug="braces-orthodontics-guide",
                content="Orthodontic treatment uses braces or aligners to move teeth that are crooked or don't fit together right. By fixing these problems, orthodontics can also help keep your mouth healthy.",
                category=ArticleCategory.procedures,
                author="Dr. Ortho",
                is_published=True,
                read_time_minutes=7
            ),
            Article(
                title="Dental Implants: The Permanent Solution for Missing Teeth",
                slug="dental-implants-guide",
                content="Dental implants are replacement tooth roots. Implants provide a strong foundation for fixed (permanent) or removable replacement teeth that are made to match your natural teeth.",
                category=ArticleCategory.procedures,
                author="Dr. Implant",
                is_published=True,
                read_time_minutes=8
            ),
            Article(
                title="Tooth Extraction: Why and How It's Done",
                slug="tooth-extraction-guide",
                content="While the goal is always to save your natural teeth, sometimes an extraction is necessary due to severe decay, infection, or crowding. Your dentist will ensure you are comfortable throughout the procedure.",
                category=ArticleCategory.procedures,
                author="Dr. Surgeon",
                is_published=True,
                read_time_minutes=5
            )
        ]
        await db["articles"].insert_many([a.to_dict() for a in articles])
        print("Added articles.")
        
    print("Database seeding process completed!")

async def main():
    from app.core.database import check_db_connection
    db = await check_db_connection()
    
    # Create indexes
    await db["users"].create_index("email", unique=True)
    await db["users"].create_index("phone", unique=True)
    await db["articles"].create_index("slug", unique=True)
    
    try:
        await db["appointments"].drop_index("dentist_id_1_scheduled_at_1")
    except Exception:
        pass

    await db["appointments"].create_index(
        [("dentist_id", 1), ("scheduled_at", 1)],
        unique=True,
        partialFilterExpression={"status": "Upcoming"}
    )
    
    await seed_mongodb_data(db)

if __name__ == "__main__":
    asyncio.run(main())
