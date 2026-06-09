from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.user import User, Clinic, Dentist
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/clinics")
async def get_clinics(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Clinic))
    return result.scalars().all()

@router.get("/dentists/{clinic_id}")
async def get_dentists(clinic_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Join with User to get names
    result = await db.execute(
        select(Dentist, User)
        .join(User, Dentist.user_id == User.id)
        .where(Dentist.clinic_id == clinic_id)
    )
    # Format nicely
    dentists = []
    for d, u in result:
        dentists.append({
            "id": d.id,
            "full_name": u.full_name,
            "specialization": d.specialization,
            "bio": d.bio
        })
    return dentists

@router.get("/slots")
async def get_available_slots(dentist_id: uuid.UUID, date: str):
    # For now, return some mock slots. In a real app, you'd check the database
    # and existing appointments.
    return [
        "09:00", "09:30", "10:00", "10:30", "11:00",
        "14:00", "14:30", "15:00", "15:30", "16:00"
    ]

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    req: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    appointment = Appointment(
        patient_id=current_user.id,
        dentist_id=req.dentist_id,
        clinic_id=req.clinic_id,
        scheduled_at=req.scheduled_at,
        reason=req.reason,
        notes=req.notes
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return appointment

@router.get("/", response_model=list[AppointmentResponse])
async def get_appointments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Appointment)
        .where(Appointment.patient_id == current_user.id)
        .order_by(Appointment.scheduled_at.desc())
    )
    return result.scalars().all()
