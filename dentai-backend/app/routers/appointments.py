from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.user import User, Clinic, Dentist
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.get("/clinics")
async def get_clinics(db = Depends(get_db)):
    clinic_cursor = db["clinics"].find({})
    clinics = []
    async for c_doc in clinic_cursor:
        clinics.append({
            "id": c_doc["_id"],
            "name": c_doc["name"],
            "address": c_doc["address"],
            "phone": c_doc["phone"]
        })
    return clinics

@router.get("/dentists/{clinic_id}")
async def get_dentists(clinic_id: uuid.UUID, db = Depends(get_db)):
    dentists_cursor = db["dentists"].find({"clinic_id": str(clinic_id)})
    dentists = []
    async for d_doc in dentists_cursor:
        u_doc = await db["users"].find_one({"_id": d_doc["user_id"]})
        if u_doc:
            dentists.append({
                "id": d_doc["_id"],
                "full_name": u_doc["full_name"],
                "specialization": d_doc["specialization"],
                "bio": d_doc.get("bio")
            })
    return dentists

@router.get("/slots")
async def get_available_slots(dentist_id: uuid.UUID, date: str):
    # Return mock slots as in original
    return [
        "09:00", "09:30", "10:00", "10:30", "11:00",
        "14:00", "14:30", "15:00", "15:30", "16:00"
    ]

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(
    req: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    appointment = Appointment(
        patient_id=current_user.id,
        dentist_id=req.dentist_id,
        clinic_id=req.clinic_id,
        scheduled_at=req.scheduled_at,
        reason=req.reason,
        notes=req.notes
    )
    await db["appointments"].insert_one(appointment.to_dict())
    
    # Format for response
    return {
        "id": appointment.id,
        "patient_id": appointment.patient_id,
        "dentist_id": appointment.dentist_id,
        "clinic_id": appointment.clinic_id,
        "scheduled_at": appointment.scheduled_at,
        "reason": appointment.reason,
        "status": appointment.status.value,
        "notes": appointment.notes
    }

@router.get("/", response_model=list[AppointmentResponse])
async def get_appointments(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    app_cursor = db["appointments"].find({"patient_id": str(current_user.id)}).sort("scheduled_at", -1)
    appointments = []
    async for app_doc in app_cursor:
        appointments.append({
            "id": app_doc["_id"],
            "patient_id": app_doc["patient_id"],
            "dentist_id": app_doc["dentist_id"],
            "clinic_id": app_doc["clinic_id"],
            "scheduled_at": app_doc["scheduled_at"],
            "reason": app_doc.get("reason"),
            "status": app_doc.get("status"),
            "notes": app_doc.get("notes")
        })
    return appointments
