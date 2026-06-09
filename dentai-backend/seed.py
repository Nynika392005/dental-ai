import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base
from app.models.education import Article, ArticleCategory, OralHealthTip

async def seed_data():
    engine = create_async_engine(settings.DATABASE_URL)
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Add Oral Health Tips if table is empty
        result = await session.execute(select(OralHealthTip))
        if not result.scalars().first():
            tips = [
                OralHealthTip(tip_text="Brush your teeth twice a day for two minutes each time.", category="hygiene"),
                OralHealthTip(tip_text="Don't forget to brush your tongue to remove bacteria and freshen your breath.", category="hygiene"),
                OralHealthTip(tip_text="Floss daily to remove plaque from between your teeth where your toothbrush can't reach.", category="hygiene"),
                OralHealthTip(tip_text="Replace your toothbrush every three to four months, or sooner if the bristles are frayed.", category="hygiene"),
                OralHealthTip(tip_text="Limit sugary snacks and drinks to prevent tooth decay.", category="nutrition"),
                OralHealthTip(tip_text="Drink plenty of water, especially after meals, to help wash away food particles.", category="nutrition"),
                OralHealthTip(tip_text="Visit your dentist regularly for professional cleanings and checkups.", category="routine")
            ]
            session.add_all(tips)
            print("Added oral health tips.")
        
        # Add Clinics if table is empty
        from app.models.user import Clinic, Dentist, User, RoleEnum
        from app.core.security import get_password_hash
        
        result = await session.execute(select(Clinic))
        if not result.scalars().first():
            clinics = [
                Clinic(id=uuid.uuid4(), name="Pearl Dental Clinic", address="123 Care Street, Medical District", phone="555-0101"),
                Clinic(id=uuid.uuid4(), name="Smile Center", address="456 Bright Avenue, Downtown", phone="555-0202")
            ]
            session.add_all(clinics)
            await session.flush()
            
            # Add some Dentists linked to these clinics
            # First, create users for dentists
            dentist_users = [
                User(
                    full_name="Dr. Sarah Smith", 
                    email="sarah.smith@dentai.com", 
                    phone="555-1111", 
                    password_hash="fake_hash_for_seed", # Simplified for seeding
                    role=RoleEnum.dentist,
                    is_verified=True
                ),
                User(
                    full_name="Dr. John Doe", 
                    email="john.doe@dentai.com", 
                    phone="555-2222", 
                    password_hash="fake_hash_for_seed", # Simplified for seeding
                    role=RoleEnum.dentist,
                    is_verified=True
                )
            ]
            session.add_all(dentist_users)
            await session.flush()
            
            dentists = [
                Dentist(user_id=dentist_users[0].id, clinic_id=clinics[0].id, specialization="General Dentistry", bio="Expert in restorative and preventive care."),
                Dentist(user_id=dentist_users[1].id, clinic_id=clinics[1].id, specialization="Orthodontist", bio="Helping you achieve the perfect smile.")
            ]
            session.add_all(dentists)
            print("Added clinics and dentists.")

        # Add Articles if table is empty
        result = await session.execute(select(Article))
        if not result.scalars().first():
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
            session.add_all(articles)
            print("Added articles.")
        
        await session.commit()
        print("Database seeding process completed!")

if __name__ == "__main__":
    from sqlalchemy.future import select
    asyncio.run(seed_data())
