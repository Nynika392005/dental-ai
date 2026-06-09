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
                )
            ]
            session.add_all(articles)
            print("Added articles.")
        
        await session.commit()
        print("Database seeding process completed!")

if __name__ == "__main__":
    from sqlalchemy.future import select
    asyncio.run(seed_data())
