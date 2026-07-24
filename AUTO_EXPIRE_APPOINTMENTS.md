# Automatic Appointment Status Update (Expired → Missed)

## Current Status: ✅ Already Implemented

The system already automatically updates appointment status from "Upcoming" to "Missed" when the scheduled time has passed.

## How It Works

### Backend - Two-Layer Protection

#### 1. Model-Level Check (`app/models/appointment.py`)
When an appointment is loaded from the database:
```python
if raw_status not in [AppointmentStatus.cancelled, AppointmentStatus.completed] and scheduled_dt < now_dt:
    self.status = AppointmentStatus.missed
```

#### 2. API-Level Check (`app/routers/appointments.py`)
When appointments are fetched via `GET /appointments/`:
```python
if raw_status == "Upcoming" and scheduled_dt < now_dt:
    display_status = "Missed"
    # Automatically update database as well!
    await db["appointments"].update_one(
        {"_id": app_doc["_id"]},
        {"$set": {"status": "Missed"}}
    )
```

This ensures:
- Appointments are checked every time they are retrieved
- The database is updated automatically (not just the display)
- No expired "Upcoming" appointments remain in the database

## Status Terminology

The system uses **"Missed"** instead of "Expired":
- `Upcoming` → Scheduled appointment in the future
- `Completed` → Appointment that was attended
- `Cancelled` → Appointment that was cancelled
- `Missed` → Appointment time passed without being completed

## Mobile App Display

The mobile app properly displays missed appointments with amber/yellow styling:
```typescript
Missed: { bg: '#FEF3C7', text: '#D97706' }
```

## Legacy Support

The system also handles old "expired" status values and maps them to "Missed":
```python
elif raw_status in ["expired", "missed"]:
    raw_status = "Missed"
```

## Example Flow

1. **User books appointment** for Jan 15, 2024 at 10:00 AM
   - Status: `Upcoming`

2. **Time passes** - It's now Jan 16, 2024

3. **User opens appointments list**
   - Backend checks: `scheduled_at < now`
   - Auto-updates status: `Upcoming` → `Missed`
   - Database updated immediately
   - Display shows "Missed" with amber badge

4. **Subsequent requests**
   - Appointment already marked as "Missed" in database
   - No further updates needed

## Benefits

✅ **Automatic** - No manual intervention required  
✅ **Real-time** - Updates on every fetch  
✅ **Persistent** - Database is updated, not just display  
✅ **Backward compatible** - Handles legacy "expired" status  
✅ **Prevents actions** - Users cannot cancel/modify missed appointments
