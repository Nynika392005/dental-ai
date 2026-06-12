from google import genai
from google.genai import types
from app.core.config import settings
from dotenv import load_dotenv
import os
import json
import random
import re

load_dotenv()

def get_client():
    api_key = os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
    return genai.Client(api_key=api_key)

def extract_json(text):
    try:
        text = text.replace('```json', '').replace('```', '').strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match: return json.loads(match.group())
        return json.loads(text)
    except: return None

async def analyze_image_task(image_base64: str, task_type: str) -> dict:
    t_type = str(task_type).strip().lower()

    try:
        client = get_client()
        prompt = f"Analyze this {t_type} image for dental health. Return strict JSON only, no explanation."
        import base64
        image_bytes = base64.b64decode(image_base64)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt
            ]
        )
        data = extract_json(response.text)
        if data:
            return data
    except Exception as e:
        print(f">>> AI Vision Error: {e}")

    # --- DYNAMIC MOCK FALLBACK ---
    scenarios = {
        "food": [
            {"impact_score": 3, "analysis": "High sugar and acidity detected.", "advice": "Rinse with water."},
            {"impact_score": 9, "analysis": "Crunchy vegetables detected. Good for gums.", "advice": "Keep it up!"}
        ],
        "tooth": [
            {"findings": "Possible cavity on molar.", "recommendations": "See a dentist.", "urgency": "soon"},
            {"findings": "Healthy teeth visible.", "recommendations": "Keep brushing twice daily.", "urgency": "monitor"}
        ],
        "habit": [
            {"detected_habit": "Teeth Grinding", "confidence_score": 90, "signs_observed": "Wear facets", "long_term_risk": "Enamel loss", "prevention_tip": "Night guard."},
            {"detected_habit": "Nail Biting", "confidence_score": 80, "signs_observed": "Small chips", "long_term_risk": "Chipped teeth", "prevention_tip": "Keep nails short."}
        ],
        "medicine": [
            {"name": "Amoxicillin", "purpose": "Infection", "dosage": "500mg 3x daily", "side_effects": "Nausea", "warnings": "Finish course."},
            {"name": "Ibuprofen", "purpose": "Pain", "dosage": "400mg", "side_effects": "None", "warnings": "Take with food."}
        ]
    }
    return random.choice(scenarios.get(t_type, [{"error": "Unknown type"}]))

async def stream_chat_response(message: str, history: list):
    api_key = os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
    if not api_key:
        print(">>> Chat Error: GOOGLE_API_KEY is not set!")
        yield f"data: {json.dumps({'token': 'Configuration error: GOOGLE_API_KEY is not set.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    try:
        client = get_client()

        system_prompt = (
            "You are DentAI, a knowledgeable and friendly dental health assistant. "
            "You help patients and dentists with questions about oral hygiene, dental procedures, "
            "symptoms, medications, diet, and general dental care. "
            "Give clear, accurate, and practical advice. "
            "Always recommend consulting a licensed dentist for diagnosis or treatment. "
            "Be concise but thorough. Never refuse dental health questions."
        )

        # Build conversation history
        contents = []
        for msg in history:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            # google-genai uses 'user' and 'model' roles
            genai_role = "model" if role == "assistant" else "user"
            contents.append(types.Content(role=genai_role, parts=[types.Part(text=content)]))

        # Add current message
        contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

        full_response = ""
        for chunk in client.models.generate_content_stream(
            model="gemini-1.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7,
            )
        ):
            if chunk.text:
                full_response += chunk.text
                yield f"data: {json.dumps({'token': chunk.text})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        print(f">>> Chat Error: {type(e).__name__}: {e}")
        yield f"data: {json.dumps({'token': f'AI service error: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"

async def analyze_symptoms(symptoms: list[str]) -> dict:
    try:
        client = get_client()
        symptoms_text = ", ".join(symptoms)
        prompt = (
            f"A dental patient reports the following symptoms: {symptoms_text}. "
            "Provide a brief assessment of what these symptoms might indicate and an urgency level. "
            "Return ONLY a JSON object with keys 'ai_assessment' (string) and 'urgency_level' (string, one of: urgent, soon, monitor). "
            'Example: {"ai_assessment": "...", "urgency_level": "soon"}'
        )
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are a dental health AI. Respond only with valid JSON.",
                temperature=0.3,
            )
        )
        data = extract_json(response.text)
        if data and 'ai_assessment' in data and 'urgency_level' in data:
            urgency = data['urgency_level'].lower().strip()
            if urgency not in ['urgent', 'soon', 'monitor']:
                urgency = 'monitor'
            return {"ai_assessment": data['ai_assessment'], "urgency_level": urgency}
    except Exception as e:
        print(f">>> Symptom Analysis Error: {e}")

    return {
        "ai_assessment": "Based on your symptoms, we recommend consulting a dentist for a proper evaluation.",
        "urgency_level": "monitor"
    }
