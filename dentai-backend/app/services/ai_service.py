import json
import logging
import os
import re
import asyncio
from dotenv import load_dotenv
from groq import Groq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings

load_dotenv()
logger = logging.getLogger(__name__)

def get_google_model(model_name="gemini-1.5-flash"):
    api_key = os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
    if not api_key:
        raise ValueError("GOOGLE_API_KEY is not configured")
    return ChatGoogleGenerativeAI(model=model_name, google_api_key=api_key, temperature=0.1)

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
    """Production-grade vision analysis with real-time AI only."""
    models = ["gemini-1.5-flash", "gemini-1.5-pro"]
    
    prompts = {
        "food": "Analyze this food/drink for dental health. Return JSON with keys: impact_score (1-10), dental_analysis, preventative_advice.",
        "tooth": "Analyze this dental photo. Return JSON with keys: findings, professional_recommendations, urgency (urgent/soon/monitor).",
        "habit": "Analyze for oral habits (Bruxism, etc). Return JSON with keys: detected_habit, confidence_score, long_term_risks, clinical_advice.",
        "medicine": "Analyze this medicine pack. Return JSON with keys: name, medical_purpose, dosage_instructions, safety_warnings."
    }

    last_error = "Unknown error"
    for model_name in models:
        try:
            model = get_google_model(model_name)
            content = [
                {"type": "text", "text": prompts.get(task_type, "Analyze this dental image.")},
                {"type": "image_url", "image_url": f"data:image/jpeg;base64,{image_base64}"}
            ]
            response = await asyncio.wait_for(model.ainvoke([HumanMessage(content=content)]), timeout=30.0)
            data = extract_json(str(response.content))
            if data:
                return data
        except Exception as e:
            last_error = str(e)
            logger.error(f"Vision model {model_name} failed: {e}")

    # Production response: Return a structured error so the UI can handle it gracefully
    return {"error": "AI_SERVICE_UNAVAILABLE", "message": "The dental analysis engine is currently busy. Please try again in a moment."}

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
    """Production-grade symptom analysis with real-time AI only."""
    try:
        model = get_google_model("gemini-1.5-flash")
        instruction = (
            "Analyze these dental symptoms and provide a brief assessment and urgency level. "
            "Return ONLY a JSON object: "
            '{"ai_assessment": "<string>", "urgency_level": "<urgent|soon|monitor>"}'
        )
        user_message = f"Symptoms: {', '.join(symptoms)}"

        response = await asyncio.wait_for(
            model.ainvoke([
                SystemMessage(content="You are a dental health AI. Respond only with valid JSON."),
                HumanMessage(content=f"{instruction}\n\n{user_message}")
            ]),
            timeout=15.0
        )

        data = extract_json(str(response.content))
        if data:
            return data
    except Exception as e:
        logger.error(f"Symptom analysis failed: {e}")

    return {
        "ai_assessment": "I am currently unable to analyze your symptoms. Please consult a licensed dentist for a proper evaluation.",
        "urgency_level": "monitor"
    }

async def stream_chat_response(message: str, history: list):
    """Secure streaming chat with system identity enforcement."""
    try:
        model = get_google_model("gemini-1.5-flash")
        system_prompt = "You are DentAI, a clinical dental assistant. Provide accurate, evidence-based advice. Always advise seeing a dentist for diagnosis."

        messages = [SystemMessage(content=system_prompt)]
        for msg in history:
            messages.append(HumanMessage(content=msg.content) if msg.role == "user" else AIMessage(content=msg.content))
        messages.append(HumanMessage(content=message))

        async for chunk in model.astream(messages):
            if chunk.content:
                yield f"data: {json.dumps({'token': chunk.content})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Chat stream failed: {e}")
        yield f"data: {json.dumps({'token': 'I apologize, but my connection is unstable. Please try again.'})}\n\n"
        yield "data: [DONE]\n\n"
