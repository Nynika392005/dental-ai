import pytest
import uuid
import json
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, check_db_connection
from app.models.user import User, RoleEnum
from app.models.chat import Conversation
from app.models.appointment import Appointment
from app.services.ai_service import extract_json, FoodAnalysisSchema, ToothAnalysisSchema
from app.dependencies import get_current_user

# Create test client
client = TestClient(app)

def run_async(coro):
    """Helper to run async code inside synchronous tests reliably on any Python version."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

@pytest.fixture(autouse=True)
def setup_db_indexes():
    async def _setup():
        db = await check_db_connection()
        await db["appointments"].create_index(
            [("dentist_id", 1), ("scheduled_at", 1)],
            unique=True,
            partialFilterExpression={"status": {"$in": ["scheduled", "confirmed"]}}
        )
        # Clear collections to maintain clean state
        db["users"]._write([])
        db["conversations"]._write([])
        db["messages"]._write([])
        db["appointments"]._write([])
        db["bookmarks"]._write([])
        db["articles"]._write([])
        db["dentists"]._write([])
        db["clinics"]._write([])
    run_async(_setup())

def mock_get_current_user(role=RoleEnum.patient):
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        full_name="Test User",
        email=f"test_{role.value}@example.com",
        role=role,
        is_verified=True
    )
    return user

# Override authentication dependency helper
def override_auth(user):
    app.dependency_overrides[get_current_user] = lambda: user


def test_nosql_operator_injection_prevention():
    # 1. Test Query Parameters containing operator starting with $
    user = mock_get_current_user()
    override_auth(user)
    
    response = client.get("/education/articles", params={"$regex": ".*"})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid operator key in query parameters."

    # 2. Test JSON Request Body containing nested operators starting with $
    payload = {"message": "hello", "conversation_id": None, "$ne": "something"}
    response = client.post("/chat/message", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid operator key in request body."


def test_idor_conversation_ownership():
    # Setup test data
    user_a = mock_get_current_user()
    user_b = mock_get_current_user()
    conv_id = uuid.uuid4()

    async def _prepare():
        db = await check_db_connection()
        await db["users"].insert_one(user_a.to_dict())
        await db["users"].insert_one(user_b.to_dict())
        conv = Conversation(id=conv_id, user_id=user_a.id, title="User A Chat")
        await db["conversations"].insert_one(conv.to_dict())
    
    run_async(_prepare())

    # Authenticate as User B and attempt to retrieve User A's conversation
    override_auth(user_b)
    
    response = client.get(f"/chat/conversations/{conv_id}")
    assert response.status_code == 404  # Fail-closed

    # Authenticate as User B and attempt to inject a message into User A's conversation
    payload = {"message": "unauthorized msg", "conversation_id": str(conv_id)}
    response = client.post("/chat/message", json=payload)
    assert response.status_code == 404  # Fail-closed


def test_idor_appointment_status_update():
    dentist_user_a = mock_get_current_user(role=RoleEnum.dentist)
    dentist_user_b = mock_get_current_user(role=RoleEnum.dentist)
    dentist_a_id = uuid.uuid4()
    dentist_b_id = uuid.uuid4()
    appointment_id = uuid.uuid4()

    async def _prepare():
        db = await check_db_connection()
        await db["users"].insert_one(dentist_user_a.to_dict())
        await db["users"].insert_one(dentist_user_b.to_dict())
        
        await db["dentists"].insert_one({
            "_id": str(dentist_a_id),
            "user_id": str(dentist_user_a.id),
            "clinic_id": str(uuid.uuid4()),
            "specialization": "General"
        })
        await db["dentists"].insert_one({
            "_id": str(dentist_b_id),
            "user_id": str(dentist_user_b.id),
            "clinic_id": str(uuid.uuid4()),
            "specialization": "Pediatric"
        })

        app = Appointment(
            id=appointment_id,
            patient_id=uuid.uuid4(),
            dentist_id=dentist_a_id,
            clinic_id=uuid.uuid4(),
            scheduled_at=datetime.utcnow() + timedelta(days=1),
            reason="Checkup",
            status="scheduled"
        )
        await db["appointments"].insert_one(app.to_dict())

    run_async(_prepare())

    # Authenticate as Dentist B (unauthorized) and attempt to change status
    override_auth(dentist_user_b)
    response = client.patch(f"/appointments/{appointment_id}/status", json={"status": "confirmed"})
    assert response.status_code == 404  # Fail-closed

    # Authenticate as Dentist A (authorized) and verify status update works
    override_auth(dentist_user_a)
    response = client.patch(f"/appointments/{appointment_id}/status", json={"status": "confirmed"})
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


def test_appointment_double_booking_race_prevention():
    dentist_user = mock_get_current_user(role=RoleEnum.dentist)
    patient_user = mock_get_current_user(role=RoleEnum.patient)
    dentist_id = uuid.uuid4()
    clinic_id = uuid.uuid4()
    booking_time = datetime.utcnow() + timedelta(days=2)

    async def _prepare():
        db = await check_db_connection()
        await db["users"].insert_one(dentist_user.to_dict())
        await db["users"].insert_one(patient_user.to_dict())
        await db["dentists"].insert_one({
            "_id": str(dentist_id),
            "user_id": str(dentist_user.id),
            "clinic_id": str(clinic_id),
            "specialization": "Orthodontics"
        })
        await db["clinics"].insert_one({
            "_id": str(clinic_id),
            "name": "Dental Clinic",
            "address": "123 Main St",
            "phone": "555-1234"
        })

    run_async(_prepare())
    override_auth(patient_user)

    payload = {
        "dentist_id": str(dentist_id),
        "clinic_id": str(clinic_id),
        "scheduled_at": booking_time.isoformat(),
        "reason": "Root Canal"
    }

    # Run concurrent calls using standard multithreading to simulate concurrent network requests
    import concurrent.futures
    
    def post_booking():
        # Each thread gets its own TestClient call
        with TestClient(app) as test_client:
            return test_client.post("/appointments/", json=payload)

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(post_booking) for _ in range(2)]
        results = [f.result() for f in futures]

    status_codes = [res.status_code for res in results]
    
    # Assert that one booking succeeds (200 OK) and the duplicate concurrent booking is rejected with 409 Conflict
    assert 200 in status_codes
    assert 409 in status_codes


def test_invalid_mimetype_and_non_image_uploads():
    user = mock_get_current_user()
    override_auth(user)

    # 1. Attempt upload with non-permitted Content-Type
    files = {"file": ("malicious.sh", b"echo 'harmful content'", "text/x-shellscript")}
    response = client.post("/analysis/scan", data={"task_type": "tooth"}, files=files)
    assert response.status_code == 400
    assert response.json()["detail"] == "Only image files are allowed (JPEG, PNG, WEBP)"

    # 2. Attempt upload with spoofed header but invalid file signatures (rejected by filetype guess check)
    files = {"file": ("malicious.png", b"fake binary content", "image/png")}
    response = client.post("/analysis/scan", data={"task_type": "tooth"}, files=files)
    assert response.status_code == 400
    assert response.json()["detail"] == "File content does not match a valid image type."


def test_malformed_llm_json_validation():
    # 1. Output containing extra text and no JSON structure
    text = "Here is the response from the LLM assistant which is not JSON."
    res = extract_json(text, FoodAnalysisSchema)
    assert res is None

    # 2. Output containing keys that do not align with required schema
    text = '{"findings": "no cavities found", "urgency": "low"}'
    res = extract_json(text, ToothAnalysisSchema)
    # Failed schema validation because 'urgency' expected literally "urgent"|"soon"|"monitor", and "recommendations" field was missing
    assert res is None

    # 3. Output containing correctly formatted JSON but out of bounds value
    text = '{"impact_score": 15, "analysis": "Too much sugar", "advice": "Rinse"}'
    res = extract_json(text, FoodAnalysisSchema)
    # Failed schema validation because 'impact_score' is out of bounds (15 is > 10)
    assert res is None

    # 4. Success check
    text = '{"impact_score": 5, "analysis": "Balanced food", "advice": "Brush well"}'
    res = extract_json(text, FoodAnalysisSchema)
    assert res is not None
    assert res["impact_score"] == 5
