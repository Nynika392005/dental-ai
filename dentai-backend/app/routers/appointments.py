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
    """
    Get list of unique active clinics
    Removes duplicates based on name and address (case-insensitive)
    Only shows clinics marked as active (is_active != false)
    Filters only automated test data (e2e, selenium)
    """
    # Find clinics that are active (is_active is not explicitly false)
    clinic_cursor = db["clinics"].find({
        "$or": [
            {"is_active": {"$ne": False}},  # is_active is not False
            {"is_active": {"$exists": False}}  # or is_active field doesn't exist (default to active)
        ]
    })
    
    seen = {}
    unique_clinics = []
    
    async for c_doc in clinic_cursor:
        name = c_doc.get("name", "").strip()
        address = c_doc.get("address", "").strip()
        
        # Skip automated test data (e2e, selenium, automation)
        if any(pattern in name.lower() for pattern in ["e2e", "selenium", "automation"]):
            continue
        
        # Create a unique key (case-insensitive)
        key = (name.lower(), address.lower())
        
        # Skip if we've already seen this clinic
        if key in seen:
            continue
            
        seen[key] = True
        unique_clinics.append({
            "id": c_doc["_id"],
            "name": name,
            "address": address,
            "phone": c_doc.get("phone", ""),
        })
    
    # Sort by name for consistent ordering
    unique_clinics.sort(key=lambda x: x["name"].lower())
    return unique_clinics


@router.get("/dentists/{clinic_id}")
async def get_dentists(
    clinic_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Get list of active dentists for a clinic
    Only returns dentists with active user accounts
    Filters only automated test accounts (e2e, selenium, @example.com)
    """
    dentists_cursor = db["dentists"].find({"clinic_id": clinic_id})
    dentists = []
    seen_users = set()
    
    async for d_doc in dentists_cursor:
        user_id = d_doc.get("user_id")
        
        # Skip if we've already added this user
        if user_id in seen_users:
            continue
            
        u_doc = await db["users"].find_one({"_id": user_id})
        
        # Only include dentists with active user accounts and not automated test accounts
        if u_doc and u_doc.get("role") == "dentist":
            email = u_doc.get("email", "").lower()
            full_name = u_doc.get("full_name", "").lower()
            
            # Skip automated test accounts (e2e, selenium, automation, @example.com)
            test_patterns = ["e2e", "selenium", "@example.com", "automation"]
            if any(pattern in email or pattern in full_name for pattern in test_patterns):
                continue
            
            seen_users.add(user_id)
            dentists.append({
                "id": d_doc["_id"],
                "full_name": u_doc.get("full_name", "Unknown"),
                "specialization": d_doc.get("specialization", "General Dentistry"),
                "bio": d_doc.get("bio", ""),
            })
    
    # Sort by name for consistent ordering
    dentists.sort(key=lambda x: x["full_name"])
    return dentists


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

    # Base available slots (9 AM to 4 PM with 30-minute intervals)
    all_slots = [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    ]
    
    try:
        # Get current date and time  
        now = datetime.datetime.now()
        selected_date = datetime.datetime.combine(date, datetime.time.min)
        
        available_slots = []
        
        for slot_time in all_slots:
            try:
                # Parse slot time
                hour, minute = map(int, slot_time.split(":"))
                slot_datetime = selected_date.replace(hour=hour, minute=minute)
                
                # Only include future time slots (not past times)
                if slot_datetime > now:
                    available_slots.append(slot_time)
                        
            except Exception as slot_error:
                logger.error(f"Error processing slot {slot_time}: {slot_error}")
                continue
        
        # If no future slots available today, return all slots (for future dates)
        if not available_slots and date > datetime.date.today():
            return all_slots
            
        return available_slots
        
    except Exception as e:
        logger.error(f"Error in get_available_slots: {e}")
        # Fallback to all slots if there's an error with filtering
        return all_slots


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

    appointment = Appointment(
        patient_id=current_user.id,
        dentist_id=req.dentist_id,
        clinic_id=req.clinic_id,
        scheduled_at=req.scheduled_at,
        reason=req.reason,
        notes=req.notes,
        status="Upcoming"
    )
    
    # Rely on atomic database unique constraint to prevent double-booking
    # The unique compound index on (dentist_id, scheduled_at) with status="Upcoming" 
    # ensures only one appointment per dentist per time slot
    from pymongo.errors import DuplicateKeyError
    try:
        await db["appointments"].insert_one(appointment.to_dict())
    except DuplicateKeyError as e:
        # This is expected when two users try to book the same slot
        # Log as INFO, not ERROR, since this is normal behavior
        logger.info(
            f"Double booking prevented: dentist_id={req.dentist_id}, "
            f"scheduled_at={req.scheduled_at}, patient_id={current_user.id}"
        )
        raise HTTPException(
            status_code=409, 
            detail="This time slot is already booked. Please select another available time."
        )

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
    """
    Cancel an appointment - available to both patients and dentists
    Patients can only cancel their own upcoming appointments
    Dentists can cancel appointments with their patients
    """
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

    # Check if appointment is in the future
    scheduled_at_str = app_doc.get("scheduled_at")
    if scheduled_at_str:
        scheduled_dt = datetime.datetime.fromisoformat(scheduled_at_str.replace('Z', '+00:00')).replace(tzinfo=None)
        if scheduled_dt < datetime.datetime.utcnow():
            raise HTTPException(status_code=400, detail="Cannot cancel past appointments")

    # Check current status
    current_status = app_doc.get("status", "Upcoming")
    if current_status in ["Completed", "Missed", "Cancelled", "completed", "cancelled", "expired", "missed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel completed, missed, or already cancelled appointments")

    # Update status to cancelled
    await db["appointments"].update_one(
        {"_id": str(appointment_id)},
        {"$set": {"status": "Cancelled"}}
    )

    return {
        "message": "Appointment cancelled successfully", 
        "appointment_id": str(appointment_id),
        "cancelled_by": role
    }

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
