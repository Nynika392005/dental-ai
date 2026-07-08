import json
import logging
import os
import re
import asyncio
import traceback
from dotenv import load_dotenv
from groq import Groq
from app.core.config import settings

load_dotenv()
logger = logging.getLogger(__name__)

def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured")
    return Groq(api_key=api_key)

def extract_json(text: str) -> dict | None:
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        return json.loads(text)
    except Exception:
        return None

async def analyze_image_task(image_base64: str, task_type: str) -> dict:
    """Production-grade vision analysis using Groq (Llama 3 Vision)."""
    try:
        client = get_groq_client()

        # NOTE: Groq vision models do NOT support response_format parameter.
        # JSON output is enforced via the prompt and parsed with extract_json().
        prompts = {
            "food": (
                "Analyze this food/drink image for dental health impact. "
                "If the food is not clearly visible, make your best assessment based on what you can see. "
                "Never leave a field empty — always provide a meaningful answer. "
                "Respond ONLY with valid JSON: "
                "{\"impact_score\": <1-10>, \"dental_analysis\": \"<detailed analysis of dental impact>\", "
                "\"preventative_advice\": \"<specific advice to protect teeth>\"}"
            ),
            "tooth": (
                "Analyze this dental photo for visible issues. "
                "Describe what you observe in detail. If image quality is low, note that but still provide your best assessment. "
                "Never leave a field empty. "
                "Respond ONLY with valid JSON: "
                "{\"findings\": \"<detailed description of what you see>\", "
                "\"professional_recommendations\": \"<specific dental advice>\", \"urgency\": \"urgent|soon|monitor\"}"
            ),
            "habit": (
                "Analyze this image for signs of oral habits such as bruxism, nail-biting, or teeth grinding. "
                "Provide your best assessment even if signs are subtle. Never leave a field empty. "
                "Respond ONLY with valid JSON: "
                "{\"detected_habit\": \"<habit name or 'No habit detected'>\", \"confidence_score\": <0.0-1.0>, "
                "\"long_term_risks\": \"<potential risks if untreated>\", \"clinical_advice\": \"<recommended action>\"}"
            ),
            "medicine": (
                "Analyze this medicine packaging image carefully. "
                "Read all visible text. If any detail is not clearly visible, use your medical knowledge "
                "to fill it in based on the medicine name/type you can identify — never leave a field empty. "
                "Respond ONLY with valid JSON: "
                "{\"name\": \"<full medicine name>\", \"medical_purpose\": \"<what condition it treats>\", "
                "\"dosage_instructions\": \"<how and when to take it>\", \"safety_warnings\": \"<side effects and warnings>\"}"
            ),
        }

        prompt_text = prompts.get(task_type, "Analyze this dental image. Respond ONLY with valid JSON.")

        completion = await asyncio.to_thread(
            client.chat.completions.create,
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                    ]
                }
            ],
            # response_format is intentionally omitted — not supported by Groq vision models
        )

        raw = completion.choices[0].message.content
        parsed = extract_json(raw)
        if parsed is not None:
            return parsed

        # If the model returned plain text instead of JSON, wrap it gracefully
        logger.warning(f"Vision model returned non-JSON response for task '{task_type}': {raw[:200]}")
        return {"findings": raw, "professional_recommendations": "Please consult a dentist.", "urgency": "monitor"}

    except Exception as e:
        logger.error(f"Groq Vision failed: {e}\n{traceback.format_exc()}")
        return {"error": "AI_SERVICE_UNAVAILABLE", "message": "Analysis engine is busy. Please try again."}

async def transcribe_audio(audio_file_path: str) -> str:
    """Production-grade audio transcription using Groq Whisper."""
    try:
        client = get_groq_client()
        with open(audio_file_path, "rb") as file:
            transcription = await asyncio.to_thread(
                client.audio.transcriptions.create,
                file=(os.path.basename(audio_file_path), file.read()),
                model="whisper-large-v3",
                response_format="text",
                language="en",
            )
            return str(transcription).strip()
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return ""

async def analyze_symptoms(symptoms: list[str]) -> dict:
    """Symptom analysis using Groq Llama."""
    try:
        client = get_groq_client()
        instruction = (
            "Analyze these dental symptoms and provide assessment and urgency. "
            "Return JSON: {\"ai_assessment\": \"string\", \"urgency_level\": \"urgent|soon|monitor\"}"
        )
        user_message = f"Symptoms: {', '.join(symptoms)}"

        completion = await asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a dental AI. Respond only with JSON."},
                {"role": "user", "content": f"{instruction}\n\n{user_message}"}
            ],
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        logger.error(f"Symptom analysis failed: {e}")
        return {"ai_assessment": "Consult a dentist.", "urgency_level": "monitor"}

async def stream_chat_response(message: str, history: list):
    """Streaming chat using Groq Llama 3."""
    try:
        client = get_groq_client()
        system_prompt = "You are DentAI, a professional clinical dental assistant. Always advise seeing a dentist."

        messages = [{"role": "system", "content": system_prompt}]
        for msg in history:
            role = getattr(msg, 'role', 'user')
            content = getattr(msg, 'content', '')
            messages.append({"role": "user" if role == "user" else "assistant", "content": content})

        messages.append({"role": "user", "content": message})

        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield f"data: {json.dumps({'token': token})}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"Chat stream failed: {e}")
        yield f"data: {json.dumps({'token': 'Connection issue. Please try again.'})}\n\n"
        yield "data: [DONE]\n\n"
