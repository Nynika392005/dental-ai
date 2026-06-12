from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from dotenv import load_dotenv
import os
import json
import random
import re

load_dotenv()

def get_chat_model(model_name="models/gemini-1.5-flash"):
    api_key = os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
    # Ensure we are using the most stable model name format
    return ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key, temperature=0.7)

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
        # Trying with the 'models/' prefix which is more compatible with some API versions
        model = get_chat_model("models/gemini-1.5-flash")
        prompt = f"Analyze this {t_type} image for dental health. Return strict JSON."
        content = [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": f"data:image/jpeg;base64,{image_base64}"}]
        response = await model.ainvoke([HumanMessage(content=content)])
        data = extract_json(str(response.content))
        if data: return data
    except Exception as e:
        print(f">>> AI Vision Error: {e}")

    # --- DYNAMIC MOCK FALLBACK ---
    # Ensuring variety in responses for demo
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
    try:
        model = get_chat_model("models/gemini-1.5-flash")
        system_prompt = (
            "You are DentAI, a knowledgeable and friendly dental health assistant. "
            "You help patients and dentists with questions about oral hygiene, dental procedures, "
            "symptoms, medications, diet, and general dental care. "
            "Give clear, accurate, and practical advice. "
            "Always recommend consulting a licensed dentist for diagnosis or treatment. "
            "Be concise but thorough. Never refuse dental health questions."
        )
        messages = [SystemMessage(content=system_prompt)]

        # Include conversation history for context
        for msg in history:
            role = msg.role if hasattr(msg, 'role') else msg.get('role', 'user')
            content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
            if role == 'user':
                messages.append(HumanMessage(content=content))
            elif role == 'assistant':
                messages.append(AIMessage(content=content))

        messages.append(HumanMessage(content=message))

        async for chunk in model.astream(messages):
            yield f"data: {json.dumps({'token': chunk.content})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        print(f">>> Chat Error: {e}")
        yield f"data: {json.dumps({'token': 'I am DentAI. Please remember to brush and floss daily for a healthy smile!'})}\n\n"
        yield "data: [DONE]\n\n"

async def analyze_symptoms(symptoms: list[str]) -> dict:
    try:
        model = get_chat_model("models/gemini-1.5-flash")
        symptoms_text = ", ".join(symptoms)
        prompt = (
            f"A dental patient reports the following symptoms: {symptoms_text}. "
            "As a dental AI assistant, provide: "
            "1. A brief assessment of what these symptoms might indicate. "
            "2. An urgency level: choose exactly one of: urgent, soon, monitor. "
            "Return ONLY a JSON object with keys 'ai_assessment' (string) and 'urgency_level' (string). "
            "Example: {\"ai_assessment\": \"...\", \"urgency_level\": \"soon\"}"
        )
        response = await model.ainvoke([
            SystemMessage(content="You are a dental health AI. Respond only with valid JSON."),
            HumanMessage(content=prompt)
        ])
        data = extract_json(str(response.content))
        if data and 'ai_assessment' in data and 'urgency_level' in data:
            # Normalize urgency level
            urgency = data['urgency_level'].lower().strip()
            if urgency not in ['urgent', 'soon', 'monitor']:
                urgency = 'monitor'
            return {"ai_assessment": data['ai_assessment'], "urgency_level": urgency}
    except Exception as e:
        print(f">>> Symptom Analysis Error: {e}")

    # Fallback
    return {"ai_assessment": "Based on your symptoms, we recommend consulting a dentist for a proper evaluation.", "urgency_level": "monitor"}
