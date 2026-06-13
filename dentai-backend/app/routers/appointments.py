import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("/clinics")
async def get_clinics(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    clinic_cursor = db["clinics"].find({})
    clinics = []
    async for c_doc in clinic_cursor:
        clinics.append(
            {
                "id": c_doc["_id"],
                "name": c_doc["name"],
                "address": c_doc["address"],
                "phone": c_doc["phone"],
            }
        )
    return clinics


@router.get("/dentists/{clinic_id}")
async def get_dentists(
    clinic_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    dentists_cursor = db["dentists"].find({"clinic_id": clinic_id})
    dentists = []
    async for d_doc in dentists_cursor:
        u_doc = await db["users"].find_one({"_id": d_doc["user_id"]})
        if u_doc:
            dentists.append(
                {
                    "id": d_doc["_id"],
                    "full_name": u_doc["full_name"],
                    "specialization": d_doc["specialization"],
                    "bio": d_doc.get("bio"),
                }
            )
    return dentists


# SECURITY: endpoint now requires authentication; date is typed as datetime.date
# so FastAPI rejects anything that isn't a valid ISO date string automatically.
@router.get("/slots")
async def get_available_slots(
    dentist_id: uuid.UUID,          # typed — FastAPI rejects non-UUID strings
    date: date,                     # typed — FastAPI rejects non-ISO date strings
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    # Verify dentist exists before returning slots
    dentist_doc = await db["dentists"].find_one({"_id": str(dentist_id)})
    if not dentist_doc:
        raise HTTPException(status_code=404, detail="Dentist not found")

    return [
        "09:00", "09:30", "10:00", "10:30", "11:00",
        "14:00", "14:30", "15:00", "15:30", "16:00",
    ]


@router.post("/")
async def create_appointment(
    req: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    dentist_doc = await db["dentists"].find_one({"_id": str(req.dentist_id)})
    if not dentist_doc:
        raise HTTPException(status_code=400, detail="Dentist not found")
    if dentist_doc.get("clinic_id") != str(req.clinic_id):
        raise HTTPException(status_code=400, detail="Dentist does not belong to selected clinic")

    # SECURITY: double-booking prevention — same dentist + same slot
    conflict = await db["appointments"].find_one(
        {
            "dentist_id": str(req.dentist_id),
            "scheduled_at": req.scheduled_at.isoformat()
            if hasattr(req.scheduled_at, "isoformat")
            else str(req.scheduled_at),
            "status": {"$in": ["scheduled", "confirmed"]},
        }
    )
    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked.")

    appointment = Appointment(
        patient_id=current_user.id,
        dentist_id=req.dentist_id,
        clinic_id=req.clinic_id,
        scheduled_at=req.scheduled_at,
        reason=req.reason,
        notes=req.notes,
    )
    await db["appointments"].insert_one(appointment.to_dict())

    clinic_doc = await db["clinics"].find_one({"_id": str(req.clinic_id)})
    dentist_doc2 = await db["dentists"].find_one({"_id": str(req.dentist_id)})
    dentist_name = "Unknown"
    if dentist_doc2:
        u_doc = await db["users"].find_one({"_id": dentist_doc2["user_id"]})
        if u_doc:
            dentist_name = u_doc["full_name"]

    return {
        "id": str(appointment.id),
        "patient_id": str(appointment.patient_id),
        "dentist_id": str(appointment.dentist_id),
        "clinic_id": str(appointment.clinic_id),
        "clinic_name": clinic_doc["name"] if clinic_doc else "Unknown",
        "dentist_name": dentist_name,
        "scheduled_at": appointment.scheduled_at.isoformat()
        if hasattr(appointment.scheduled_at, "isoformat")
        else appointment.scheduled_at,
        "reason": appointment.reason,
        "status": appointment.status.value
        if hasattr(appointment.status, "value")
        else appointment.status,
        "notes": appointment.notes,
    }


@router.get("/")
async def get_appointments(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    if role == "dentist":
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

        patient_name = "Unknown Patient"
        if role == "dentist":
            p_doc = await db["users"].find_one({"_id": app_doc.get("patient_id")})
            if p_doc:
                patient_name = p_doc["full_name"]

        appointments.append(
            {
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
                "notes": app_doc.get("notes"),
            }
        )
    return appointments


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role != "dentist":
        raise HTTPException(status_code=403, detail="Only dentists can update appointment status")

    new_status = body.get("status")
    valid = ["scheduled", "confirmed", "completed", "cancelled"]
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")

    dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
    if not dentist_doc:
        raise HTTPException(status_code=403, detail="Dentist profile not found")

    app_doc = await db["appointments"].find_one({"_id": appointment_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if app_doc.get("dentist_id") != dentist_doc["_id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to update this appointment")

    await db["appointments"].update_one({"_id": appointment_id}, {"$set": {"status": new_status}})
    return {"message": "Status updated", "status": new_status}
