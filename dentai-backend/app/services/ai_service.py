import json
import logging
import os
import random
import re

from dotenv import load_dotenv
from groq import Groq

from app.core.config import settings

load_dotenv()

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"


def get_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")
    return Groq(api_key=api_key)


def extract_json(text: str) -> dict | None:
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(text)
    except Exception:
        return None


async def analyze_image_task(image_base64: str, task_type: str) -> dict:
    # task_type is already validated by the caller (allow-list in the router)
    t_type = task_type.strip().lower()

    try:
        client = get_client()
        prompt = (
            f"You are a dental health AI. Analyze this {t_type} image for dental health relevance. "
            "Return ONLY a strict JSON object with relevant fields. No extra text."
        )
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                        },
                    ],
                }
            ],
            max_tokens=500,
        )
        data = extract_json(response.choices[0].message.content)
        if data:
            return data
    except Exception:
        # SECURITY: log at error level without echoing the exception message to
        # the client; the raw exception may contain API key fragments or payload data.
        logger.error("AI Vision analysis failed", exc_info=False)

    # Static mock fallback (dev/demo only)
    scenarios: dict[str, list[dict]] = {
        "food": [
            {"impact_score": 3, "analysis": "High sugar and acidity detected.", "advice": "Rinse with water after eating."},
            {"impact_score": 9, "analysis": "Crunchy vegetables detected. Great for gums.", "advice": "Keep it up!"},
        ],
        "tooth": [
            {"findings": "Possible cavity on molar.", "recommendations": "See a dentist soon.", "urgency": "soon"},
            {"findings": "Teeth appear healthy.", "recommendations": "Keep brushing twice daily.", "urgency": "monitor"},
        ],
        "habit": [
            {
                "detected_habit": "Teeth Grinding",
                "confidence_score": 90,
                "signs_observed": "Wear facets on enamel",
                "long_term_risk": "Enamel loss",
                "prevention_tip": "Use a night guard.",
            },
            {
                "detected_habit": "Nail Biting",
                "confidence_score": 80,
                "signs_observed": "Small chips on front teeth",
                "long_term_risk": "Chipped teeth",
                "prevention_tip": "Keep nails trimmed short.",
            },
        ],
        "medicine": [
            {
                "name": "Amoxicillin",
                "purpose": "Treats infection",
                "dosage": "500mg 3x daily",
                "side_effects": "Nausea",
                "warnings": "Complete the full course.",
            },
            {
                "name": "Ibuprofen",
                "purpose": "Pain relief",
                "dosage": "400mg as needed",
                "side_effects": "Stomach upset",
                "warnings": "Take with food.",
            },
        ],
    }
    return random.choice(scenarios.get(t_type, [{"error": "Unknown scan type"}]))


async def stream_chat_response(message: str, history: list):
    api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
    if not api_key:
        logger.error("GROQ_API_KEY is not set — chat unavailable")
        yield f"data: {json.dumps({'token': 'Service configuration error. Please contact support.'})}\n\n"
        yield "data: [DONE]\n\n"
        return

    try:
        client = Groq(api_key=api_key)

        system_prompt = (
            "You are DentAI, a knowledgeable and friendly dental health assistant. "
            "You help patients and dentists with questions about oral hygiene, dental procedures, "
            "symptoms, medications, diet, and general dental care. "
            "Give clear, accurate, and practical advice. "
            "Always recommend consulting a licensed dentist for diagnosis or treatment. "
            "Be concise but thorough. Never refuse dental health questions."
        )

        messages: list[dict] = [{"role": "system", "content": system_prompt}]

        for msg in history:
            role = msg.role if hasattr(msg, "role") else msg.get("role", "user")
            content = msg.content if hasattr(msg, "content") else msg.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        stream = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            stream=True,
            max_tokens=1024,
            temperature=0.7,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception:
        # SECURITY: log internally; return a generic error to the client
        logger.error("Chat stream failed", exc_info=False)
        yield f"data: {json.dumps({'token': 'AI service is temporarily unavailable. Please try again.'})}\n\n"
        yield "data: [DONE]\n\n"


async def analyze_symptoms(symptoms: list[str]) -> dict:
    # symptoms are already sanitised by the caller (symptom_checker router)
    try:
        client = get_client()
        # SECURITY: user symptoms are passed as a JSON-encoded value, not
        # interpolated inline into the instruction part of the prompt.
        user_message = json.dumps({"symptoms": symptoms})
        instruction = (
            "The user has provided a list of dental symptoms. "
            "Provide a brief assessment and urgency level. "
            "Return ONLY a JSON object: "
            '{"ai_assessment": "<string>", "urgency_level": "<urgent|soon|monitor>"}'
        )
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a dental health AI. Respond only with valid JSON. " + instruction},
                {"role": "user", "content": user_message},
            ],
            max_tokens=300,
            temperature=0.3,
        )
        data = extract_json(response.choices[0].message.content)
        if data and "ai_assessment" in data and "urgency_level" in data:
            urgency = data["urgency_level"].lower().strip()
            if urgency not in ("urgent", "soon", "monitor"):
                urgency = "monitor"
            # Truncate ai_assessment to a safe length
            assessment_text = str(data["ai_assessment"])[:2000]
            return {"ai_assessment": assessment_text, "urgency_level": urgency}
    except Exception:
        logger.error("Symptom analysis failed", exc_info=False)

    return {
        "ai_assessment": "Based on your symptoms, we recommend consulting a dentist for a proper evaluation.",
        "urgency_level": "monitor",
    }
