import logging
import datetime
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import AppointmentCreate, AppointmentResponse


# FIX-06: Typed schema replaces raw dict — prevents mass assignment and generates
# a proper OpenAPI body schema so callers cannot inject arbitrary fields.
class AppointmentStatusUpdate(BaseModel):
    status: Literal["Upcoming", "Completed", "Cancelled", "Missed"]

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
    dentist_doc = await db["dentists"].find_one({"_id": str(uuid.UUID(str(req.dentist_id)))})
    if not dentist_doc:
        raise HTTPException(status_code=400, detail="Dentist not found")
    if dentist_doc.get("clinic_id") != str(uuid.UUID(str(req.clinic_id))):
        raise HTTPException(status_code=400, detail="Dentist does not belong to selected clinic")

    # Double check conflict in memory first
    conflict = await db["appointments"].find_one(
        {
            "dentist_id": str(uuid.UUID(str(req.dentist_id))),
            "scheduled_at": req.scheduled_at.isoformat()
            if hasattr(req.scheduled_at, "isoformat")
            else str(req.scheduled_at),
            "status": "Upcoming",
        }
    )
    if conflict:
        raise HTTPException(status_code=409, detail="This time slot is already booked. Please choose another available time.")

    appointment = Appointment(
        patient_id=current_user.id,
        dentist_id=req.dentist_id,
        clinic_id=req.clinic_id,
        scheduled_at=req.scheduled_at,
        reason=req.reason,
        notes=req.notes,
        status="Upcoming"
    )
    
    # Perform atomic insert inside unique compound index catch block
    from pymongo.errors import DuplicateKeyError
    try:
        await db["appointments"].insert_one(appointment.to_dict())
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="This time slot is already booked. Please choose another available time.")

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
        p_doc = await db["users"].find_one({"_id": app_doc.get("patient_id")})
        if p_doc:
            patient_name = p_doc["full_name"]

        # Parse scheduled_at
        scheduled_at_str = app_doc.get("scheduled_at")
        scheduled_dt = datetime.datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00')).replace(tzinfo=None) if isinstance(scheduled_at_str, str) else scheduled_at_str
        
        now_dt = datetime.datetime.utcnow()
        raw_status = app_doc.get("status", "Upcoming")
        
        # Map old db entries
        if raw_status in ["scheduled", "confirmed"]:
            raw_status = "Upcoming"
        elif raw_status == "completed":
            raw_status = "Completed"
        elif raw_status == "cancelled":
            raw_status = "Cancelled"
        elif raw_status in ["expired", "missed"]:
            raw_status = "Missed"

        if raw_status == "Upcoming" and scheduled_dt < now_dt:
            display_status = "Missed"
            # Automatically update database as well!
            await db["appointments"].update_one(
                {"_id": app_doc["_id"]},
                {"$set": {"status": "Missed"}}
            )
        else:
            display_status = raw_status

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
                "status": display_status,
                "notes": app_doc.get("notes"),
            }
        )
    return appointments


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: uuid.UUID,
    body: AppointmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    new_status = body.status

    app_doc = await db["appointments"].find_one({"_id": str(appointment_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorize:
    # - If patient: can only cancel their own upcoming appointments.
    # - If dentist: can manage their own appointments.
    if role == "patient":
        if app_doc.get("patient_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="Patients can only cancel their own appointments")
        if new_status != "Cancelled":
            raise HTTPException(status_code=403, detail="Patients can only update appointment status to Cancelled")
        
        # Check if upcoming
        scheduled_at_str = app_doc.get("scheduled_at")
        if scheduled_at_str:
            scheduled_dt = datetime.datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00')).replace(tzinfo=None)
            if scheduled_dt < datetime.datetime.utcnow():
                raise HTTPException(status_code=400, detail="Cannot cancel past appointments")
            
        current_status = app_doc.get("status", "Upcoming")
        if current_status in ["Completed", "Missed", "Cancelled", "completed", "cancelled", "expired", "missed"]:
            raise HTTPException(status_code=400, detail="Cannot cancel completed, missed, or cancelled appointments")
            
    elif role == "dentist":
        dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
        if not dentist_doc or app_doc.get("dentist_id") != str(dentist_doc["_id"]):
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        current_status = app_doc.get("status", "Upcoming")
        if current_status in ["Completed", "Missed", "Cancelled", "completed", "cancelled", "expired", "missed"]:
            raise HTTPException(status_code=400, detail="This appointment is already completed, cancelled, or missed.")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    # If status is being updated to an active state (Upcoming), check unique constraint atomically
    from pymongo.errors import DuplicateKeyError
    if new_status == "Upcoming":
        try:
            await db["appointments"].update_one(
                {"_id": str(appointment_id)},
                {"$set": {"status": new_status}}
            )
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="This time slot is already booked. Please choose another available time.")
    else:
        await db["appointments"].update_one(
            {"_id": str(appointment_id)},
            {"$set": {"status": new_status}}
        )

    return {"message": "Status updated", "status": new_status}

@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    app_doc = await db["appointments"].find_one({"_id": str(appointment_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Authorize patient or dentist
    if role == "patient":
        if app_doc.get("patient_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="Patients can only cancel their own appointments")
    elif role == "dentist":
        dentist_doc = await db["dentists"].find_one({"user_id": str(current_user.id)})
        if not dentist_doc or app_doc.get("dentist_id") != str(dentist_doc["_id"]):
            raise HTTPException(status_code=404, detail="Appointment not found")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    scheduled_at_str = app_doc.get("scheduled_at")
    if scheduled_at_str:
        scheduled_dt = datetime.datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00')).replace(tzinfo=None)
        if scheduled_dt < datetime.datetime.utcnow():
            raise HTTPException(status_code=400, detail="Cannot cancel past appointments")

    current_status = app_doc.get("status", "Upcoming")
    if current_status in ["Completed", "Missed", "Cancelled", "completed", "cancelled", "expired", "missed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed, missed, or cancelled appointments")

    await db["appointments"].update_one(
        {"_id": str(appointment_id)},
        {"$set": {"status": "Cancelled"}}
    )

    return {"message": "Appointment cancelled successfully."}

@router.post("/cleanup-duplicates")
async def cleanup_duplicates(
    db=Depends(get_db)
):
    # Fetch all clinics
    clinic_cursor = db["clinics"].find({})
    clinics = []
    async for c_doc in clinic_cursor:
        clinics.append(c_doc)

    seen = {}
    duplicates_to_delete = []
    merged_count = 0
    
    for clinic in clinics:
        name = clinic.get("name", "").strip()
        address = clinic.get("address", "").strip()
        key = (name.lower(), address.lower())
        
        if key in seen:
            keep_id = seen[key]
            old_id = clinic["_id"]
            duplicates_to_delete.append(old_id)
            
            # Update dentists referencing this duplicate
            await db["dentists"].update_many({"clinic_id": old_id}, {"$set": {"clinic_id": keep_id}})
            try:
                await db["dentists"].update_many({"clinic_id": uuid.UUID(old_id)}, {"$set": {"clinic_id": uuid.UUID(keep_id)}})
            except Exception:
                pass
                
            # Update appointments referencing this duplicate
            await db["appointments"].update_many({"clinic_id": old_id}, {"$set": {"clinic_id": keep_id}})
            try:
                await db["appointments"].update_many({"clinic_id": uuid.UUID(old_id)}, {"$set": {"clinic_id": uuid.UUID(keep_id)}})
            except Exception:
                pass
                
            merged_count += 1
        else:
            seen[key] = clinic["_id"]

    if duplicates_to_delete:
        await db["clinics"].delete_many({"_id": {"$in": duplicates_to_delete}})

    return {
        "status": "success",
        "duplicates_removed": len(duplicates_to_delete),
        "merged_clinics": merged_count
    }
