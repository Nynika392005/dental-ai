import json
import logging
import os
import re
import asyncio
import traceback
import base64
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

from pydantic import BaseModel, Field
from typing import Literal

class FoodAnalysisSchema(BaseModel):
    impact_score: int = Field(..., ge=1, le=10)
    analysis: str
    advice: str

class ToothAnalysisSchema(BaseModel):
    findings: str
    recommendations: str
    urgency: Literal["urgent", "soon", "monitor"]

def extract_json(text: str, schema: type[BaseModel] = None) -> dict | None:
    try:
        text = text.replace("```json", "").replace("```", "").strip()
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            parsed = json.loads(match.group(1))
        else:
            parsed = json.loads(text)
            
        if schema is not None:
            val = schema(**parsed)
            return val.model_dump() if hasattr(val, "model_dump") else val.dict()
        return parsed
    except Exception:
        return None

async def analyze_image_task(image_base64: str, task_type: str) -> dict:
    """Production-grade vision analysis using Groq with intelligent fallbacks."""
    try:
        client = get_groq_client()

        prompts = {
            "food": (
                "Analyze this food/drink image for dental health impact. "
                "First, check if the image is actually a picture of a food or drink item. "
                "If the image does not show any food or drink, respond ONLY with the following JSON structure: "
                "{\"warning\": \"This is not a valid food or drink image. Please upload a correct image.\"}"
                "\n\nOtherwise, if it is a food or drink image, analyze it for dental health impact and respond ONLY with this JSON structure: "
                "{\"impact_score\": <1-10>, \"dental_analysis\": \"<detailed analysis of dental impact>\", "
                "\"preventative_advice\": \"<specific advice to protect teeth>\"}"
            ),
            "tooth": (
                "Analyze this dental photo for visible issues. "
                "First, check if the image is actually a picture of teeth, mouth, or oral cavity. "
                "If the image does not show teeth, mouth, or oral cavity, respond ONLY with the following JSON structure: "
                "{\"warning\": \"This is not a valid dental/tooth image. Please upload a correct image.\"}"
                "\n\nOtherwise, if it is a dental/tooth image, analyze it and respond ONLY with this JSON structure: "
                "{\"findings\": \"<detailed description of what you see>\", "
                "\"professional_recommendations\": \"<specific dental advice>\", \"urgency\": \"urgent|soon|monitor\"}"
            ),
            "habit": (
                "Analyze this image for signs of oral habits such as bruxism, nail-biting, or teeth grinding. "
                "First, check if the image shows a mouth, teeth, jaw, or a person displaying face/mouth/oral characteristics. "
                "If the image is completely unrelated, respond ONLY with the following JSON structure: "
                "{\"warning\": \"This is not a valid image for analyzing oral habits. Please upload a correct image.\"}"
                "\n\nOtherwise, analyze the image and respond ONLY with this JSON structure: "
                "{\"detected_habit\": \"<habit name or 'No habit detected'>\", \"confidence_score\": <0.0-1.0>, "
                "\"long_term_risks\": \"<potential risks if untreated>\", \"clinical_advice\": \"<recommended action>\"}"
            ),
            "medicine": (
                "You are a pharmaceutical identification expert. Analyze this image carefully. "
                "First, check if the image actually shows a medicine package, pill bottle, liquid medicine, or a tablet/pill. "
                "If the image is unrelated, respond ONLY with the following JSON structure: "
                "{\"warning\": \"This is not a valid medicine package or pill image. Please upload a correct image.\"}"
                "\n\nOtherwise, if it shows a medicine or pill, identify it and respond ONLY with this JSON structure: "
                "{\"name\": \"<medicine name or best identification>\", "
                "\"medical_purpose\": \"<what condition it treats>\", "
                "\"dosage_instructions\": \"<standard dosage and administration>\", "
                "\"safety_warnings\": \"<side effects, contraindications, and warnings>\"}"
            ),
        }

        prompt_text = prompts.get(task_type, "Analyze this dental image. Respond ONLY with valid JSON.")

        # Try available vision models
        vision_models = [
            "llava-v1.5-7b-4096-preview",  # Known to work on Groq
            "llama-3.2-90b-vision-preview",  
            "llama-3.2-11b-vision-preview"
        ]
        
        for model_name in vision_models:
            try:
                logger.info(f"🔍 Trying Groq {model_name} for {task_type} analysis")
                
                completion = await asyncio.to_thread(
                    client.chat.completions.create,
                    model=model_name,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt_text},
                                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                            ]
                        }
                    ],
                )

                raw = completion.choices[0].message.content
                parsed = extract_json(raw)
                if parsed is not None:
                    logger.info(f"✅ Groq {model_name} analysis successful for {task_type}")
                    return parsed

                # If non-JSON, return it wrapped
                logger.warning(f"Vision model {model_name} returned non-JSON response")
                return {"findings": raw, "professional_recommendations": "Please consult a dentist.", "urgency": "monitor"}
                
            except Exception as model_error:
                logger.warning(f"❌ Groq {model_name} failed: {str(model_error)[:100]}")
                continue  # Try next model
        
        # If all vision models failed, return intelligent fallback based on task type
        logger.warning("All vision models failed, returning intelligent fallback")
        
        fallback_responses = {
            "food": {
                "impact_score": 6,
                "dental_analysis": "Image analysis temporarily unavailable. General food safety advice: acidic or sugary foods can affect tooth enamel.",
                "preventative_advice": "Rinse with water after eating, limit sugary snacks, brush teeth twice daily with fluoride toothpaste."
            },
            "tooth": {
                "findings": "Image analysis temporarily unavailable. Please schedule a dental examination for proper assessment.", 
                "professional_recommendations": "Visit your dentist for a comprehensive oral examination and professional cleaning.",
                "urgency": "monitor"
            },
            "habit": {
                "detected_habit": "Analysis unavailable",
                "confidence_score": 0.0,
                "long_term_risks": "Common oral habits include teeth grinding, nail biting, and jaw clenching which can damage teeth over time.",
                "clinical_advice": "Monitor for signs of teeth grinding, jaw pain, or worn tooth surfaces. Consult your dentist if concerned."
            },
            "medicine": {
                "name": "Unable to identify medication",
                "medical_purpose": "Image analysis temporarily unavailable. Please consult a pharmacist for medication identification.",
                "dosage_instructions": "Follow the instructions on the package or consult your healthcare provider.",
                "safety_warnings": "Always verify medication details with a qualified healthcare professional before use."
            }
        }
        
        response = fallback_responses.get(task_type, fallback_responses["tooth"])
        response["service_note"] = "Vision analysis temporarily unavailable. This is a general response."
        return response

    except Exception as e:
        logger.error(f"Complete Groq failure: {e}\n{traceback.format_exc()}")
        return {
            "error": "AI_SERVICE_UNAVAILABLE", 
            "message": "Analysis engine is busy. Please try again.",
            "support": "If this persists, contact support."
        }

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
