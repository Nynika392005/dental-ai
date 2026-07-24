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
from google import genai
from google.genai import types

load_dotenv()
logger = logging.getLogger(__name__)

def get_groq_client() -> Groq:
    api_key = os.getenv("GROQ_API_KEY") or settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured")
    return Groq(api_key=api_key)

def get_gemini_client():
    """Initialize Gemini AI for vision analysis with AQ key support"""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_AI_API_KEY")
    
    if not api_key:
        logger.warning("No Gemini/Google API key found")
        return None
    
    try:
        # AQ keys require v1alpha API version
        if api_key.startswith("AQ."):
            client = genai.Client(
                api_key=api_key,
                http_options={'api_version': 'v1alpha'}
            )
            logger.info("✅ Gemini Vision API initialized with v1alpha for AQ key")
        else:
            client = genai.Client(api_key=api_key)
            logger.info("✅ Gemini Vision API initialized with v1beta for AIza key")
        
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")
        return None

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
    """Production-grade vision analysis using Gemini (preferred) or Groq fallback."""
    try:
        # Try Gemini Vision API first
        gemini_client = get_gemini_client()
        if gemini_client:
            try:
                logger.info(f"🔍 Using Gemini Vision API for {task_type} analysis")
                
                prompts = {
                    "food": (
                        "Analyze this food/drink image for dental health impact. "
                        "First, check if the image is actually a picture of a food or drink item. "
                        "If the image does not show any food or drink (for example, if it shows a person's face, an animal, a car, a pill/medicine, or dental teeth directly, or any other unrelated object), respond ONLY with the following JSON structure: "
                        "{\"warning\": \"This is not a valid food or drink image. Please upload a correct image.\"}"
                        "\n\nOtherwise, if it is a food or drink image, analyze it for dental health impact and respond ONLY with this JSON structure: "
                        "{\"impact_score\": <1-10>, \"dental_analysis\": \"<detailed analysis of dental impact>\", "
                        "\"preventative_advice\": \"<specific advice to protect teeth>\"}"
                    ),
                    "tooth": (
                        "Analyze this dental photo for visible issues. "
                        "First, check if the image is actually a picture of teeth, mouth, or oral cavity. "
                        "If the image does not show teeth, mouth, or oral cavity (for example, if it shows food, medicine packaging, a pill, a car, or an animal), respond ONLY with the following JSON structure: "
                        "{\"warning\": \"This is not a valid dental/tooth image. Please upload a correct image.\"}"
                        "\n\nOtherwise, if it is a dental/tooth image, analyze it and respond ONLY with this JSON structure: "
                        "{\"findings\": \"<detailed description of what you see>\", "
                        "\"professional_recommendations\": \"<specific dental advice>\", \"urgency\": \"urgent|soon|monitor\"}"
                    ),
                    "habit": (
                        "Analyze this image for signs of oral habits such as bruxism, nail-biting, or teeth grinding. "
                        "First, check if the image shows a mouth, teeth, jaw, or a person displaying face/mouth/oral characteristics. "
                        "If the image is completely unrelated (for example, food, medicine packaging, cars, or random scenery), respond ONLY with the following JSON structure: "
                        "{\"warning\": \"This is not a valid image for analyzing oral habits. Please upload a correct image.\"}"
                        "\n\nOtherwise, analyze the image and respond ONLY with this JSON structure: "
                        "{\"detected_habit\": \"<habit name or 'No habit detected'>\", \"confidence_score\": <0.0-1.0>, "
                        "\"long_term_risks\": \"<potential risks if untreated>\", \"clinical_advice\": \"<recommended action>\"}"
                    ),
                    "medicine": (
                        "You are a pharmaceutical identification expert. Analyze this image carefully. "
                        "First, check if the image actually shows a medicine package, pill bottle, liquid medicine, or a tablet/pill. "
                        "If the image is unrelated (for example, if it shows food, dental teeth, a person's face, an animal, or a car), respond ONLY with the following JSON structure: "
                        "{\"warning\": \"This is not a valid medicine package or pill image. Please upload a correct image.\"}"
                        "\n\nOtherwise, if it shows a medicine or pill, identify it and respond ONLY with this JSON structure: "
                        "{\"name\": \"<medicine name or best identification>\", "
                        "\"medical_purpose\": \"<what condition it treats>\", "
                        "\"dosage_instructions\": \"<standard dosage and administration>\", "
                        "\"safety_warnings\": \"<side effects, contraindications, and warnings>\"}"
                    ),
                }

                prompt_text = prompts.get(task_type, "Analyze this dental image. Respond ONLY with valid JSON.")
                
                # Convert base64 to image bytes
                image_data = base64.b64decode(image_base64)
                
                # Create content parts for Gemini SDK
                contents = [
                    types.Part.from_bytes(
                        data=image_data,
                        mime_type="image/jpeg"
                    ),
                    types.Part.from_text(text=prompt_text)
                ]
                
                # Generate response using Gemini
                response = await asyncio.to_thread(
                    gemini_client.models.generate_content,
                    model='gemini-2.0-flash-exp',
                    contents=contents,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        top_p=0.8,
                        max_output_tokens=1000,
                    )
                )
                
                if response and response.text:
                    logger.info(f"📝 Gemini response received for {task_type}")
                    parsed = extract_json(response.text)
                    if parsed is not None:
                        logger.info(f"✅ Gemini analysis successful for {task_type}")
                        return parsed
                        
            except Exception as gemini_error:
                logger.error(f"❌ Gemini Vision API error: {str(gemini_error)[:200]}")
                # Fall through to Groq fallback

        # Fallback to Groq with updated model
        try:
            client = get_groq_client()
            logger.info(f"🔄 Fallback to Groq for {task_type} analysis")

            prompts = {
                "food": (
                    "Analyze this food/drink image for dental health impact. "
                    "First, check if the image is actually a picture of a food or drink item. "
                    "If the image does not show any food or drink, respond ONLY with: "
                    "{\"warning\": \"This is not a valid food or drink image. Please upload a correct image.\"}"
                    "\n\nOtherwise, respond ONLY with: "
                    "{\"impact_score\": <1-10>, \"dental_analysis\": \"<analysis>\", \"preventative_advice\": \"<advice>\"}"
                ),
                "tooth": (
                    "Analyze this dental photo. If not teeth/mouth, respond ONLY with: "
                    "{\"warning\": \"This is not a valid dental image. Please upload a correct image.\"}"
                    "\n\nOtherwise respond ONLY with: "
                    "{\"findings\": \"<description>\", \"professional_recommendations\": \"<advice>\", \"urgency\": \"urgent|soon|monitor\"}"
                ),
                "habit": (
                    "Analyze for oral habits. If not mouth/teeth related, respond ONLY with: "
                    "{\"warning\": \"This is not a valid image for oral habit analysis.\"}"
                    "\n\nOtherwise respond ONLY with: "
                    "{\"detected_habit\": \"<habit>\", \"confidence_score\": <0.0-1.0>, \"long_term_risks\": \"<risks>\", \"clinical_advice\": \"<advice>\"}"
                ),
                "medicine": (
                    "Identify this medicine. If not medicine, respond ONLY with: "
                    "{\"warning\": \"This is not a valid medicine image.\"}"
                    "\n\nOtherwise respond ONLY with: "
                    "{\"name\": \"<name>\", \"medical_purpose\": \"<purpose>\", \"dosage_instructions\": \"<dosage>\", \"safety_warnings\": \"<warnings>\"}"
                ),
            }

            prompt_text = prompts.get(task_type, "Analyze this image.")

            # Try with current Groq vision model
            completion = await asyncio.to_thread(
                client.chat.completions.create,
                model="llama-3.2-11b-vision-preview",  # Updated working model
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
                logger.info(f"✅ Groq fallback successful for {task_type}")
                return parsed

            # If the model returned plain text instead of JSON, wrap it gracefully
            logger.warning(f"Vision model returned non-JSON response for task '{task_type}': {raw[:200]}")
            return {"findings": raw, "professional_recommendations": "Please consult a dentist.", "urgency": "monitor"}

        except Exception as groq_error:
            logger.error(f"Groq fallback failed: {groq_error}")
            # Final fallback
            return {
                "error": "VISION_API_UNAVAILABLE", 
                "message": f"Vision analysis temporarily unavailable for {task_type}. Please try again.",
                "fallback_advice": "Consult a healthcare professional for proper analysis."
            }

    except Exception as e:
        logger.error(f"Complete analysis failure: {e}\n{traceback.format_exc()}")
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
