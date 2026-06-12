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
async def get_dentists(clinic_id: str, db = Depends(get_db)):
    dentists_cursor = db["dentists"].find({"clinic_id": clinic_id})
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
async def get_available_slots(dentist_id: str, date: str):
    return [
        "09:00", "09:30", "10:00", "10:30", "11:00",
        "14:00", "14:30", "15:00", "15:30", "16:00"
    ]

@router.post("/")
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

    # Fetch clinic and dentist names for response
    clinic_doc = await db["clinics"].find_one({"_id": str(req.clinic_id)})
    dentist_doc = await db["dentists"].find_one({"_id": str(req.dentist_id)})
    dentist_name = "Unknown"
    if dentist_doc:
        u_doc = await db["users"].find_one({"_id": dentist_doc["user_id"]})
        if u_doc:
            dentist_name = u_doc["full_name"]

    return {
        "id": str(appointment.id),
        "patient_id": str(appointment.patient_id),
        "dentist_id": str(appointment.dentist_id),
        "clinic_id": str(appointment.clinic_id),
        "clinic_name": clinic_doc["name"] if clinic_doc else "Unknown",
        "dentist_name": dentist_name,
        "scheduled_at": appointment.scheduled_at.isoformat() if hasattr(appointment.scheduled_at, 'isoformat') else appointment.scheduled_at,
        "reason": appointment.reason,
        "status": appointment.status.value if hasattr(appointment.status, 'value') else appointment.status,
        "notes": appointment.notes
    }

@router.get("/")
async def get_appointments(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    # Patients see their own bookings; dentists see appointments booked with them
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)

    if role == "dentist":
        # Find the dentist profile for this user
        dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
        if not dentist_doc:
            return []
        app_cursor = db["appointments"].find({"dentist_id": dentist_doc["_id"]}).sort("scheduled_at", -1)
    else:
        app_cursor = db["appointments"].find({"patient_id": str(current_user.id)}).sort("scheduled_at", -1)

    appointments = []
    async for app_doc in app_cursor:
        clinic_doc = await db["clinics"].find_one({"_id": app_doc.get("clinic_id")})
        dentist_doc2 = await db["dentists"].find_one({"_id": app_doc.get("dentist_id")})
        dentist_name = "Unknown"
        if dentist_doc2:
            u_doc = await db["users"].find_one({"_id": dentist_doc2["user_id"]})
            if u_doc:
                dentist_name = u_doc["full_name"]

        # For dentists, also fetch patient name
        patient_name = "Unknown Patient"
        if role == "dentist":
            p_doc = await db["users"].find_one({"_id": app_doc.get("patient_id")})
            if p_doc:
                patient_name = p_doc["full_name"]

        appointments.append({
            "id": app_doc["_id"],
            "patient_id": app_doc["patient_id"],
            "dentist_id": app_doc["dentist_id"],
            "clinic_id": app_doc["clinic_id"],
            "clinic_name": clinic_doc["name"] if clinic_doc else "Unknown Clinic",
            "dentist_name": dentist_name,
            "patient_name": patient_name,
            "scheduled_at": app_doc["scheduled_at"],
            "reason": app_doc.get("reason"),
            "status": app_doc.get("status", "scheduled"),
            "notes": app_doc.get("notes")
        })
    return appointments

@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role != "dentist":
        raise HTTPException(status_code=403, detail="Only dentists can update appointment status")

    new_status = body.get("status")
    valid = ["scheduled", "confirmed", "completed", "cancelled"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")

    await db["appointments"].update_one(
        {"_id": appointment_id},
        {"$set": {"status": new_status}}
    )
    return {"message": "Status updated", "status": new_status}
