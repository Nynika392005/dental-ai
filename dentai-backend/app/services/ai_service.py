from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.core.config import settings
from dotenv import load_dotenv
import os
import json
import logging

load_dotenv()
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are DentAI, a knowledgeable and compassionate dental health assistant. 
You help patients understand their oral health concerns, educate them about 
dental procedures, and guide them on when to seek professional care.

CAPABILITIES:
- Answer questions about dental symptoms, procedures, hygiene, and prevention
- Explain dental terminology in simple language
- Provide oral health education and prevention tips
- Suggest home remedies for mild discomfort (with caveats)
- Identify when symptoms require urgent professional attention
- Assist with general appointment scheduling guidance

BOUNDARIES (ALWAYS FOLLOW):
- NEVER diagnose specific diseases or conditions definitively
- NEVER prescribe medications or specific dosages
- ALWAYS recommend consulting a licensed dentist for any diagnosis or treatment plan
- For EMERGENCY symptoms (severe pain, swelling, trauma, abscess, bleeding that won't stop, difficulty breathing/swallowing), respond with an urgent care alert card

EMERGENCY TRIGGER KEYWORDS:
["severe swelling", "can't breathe", "can't swallow", "jaw locked", 
 "heavy bleeding", "knocked out tooth", "facial trauma", "abscess burst",
 "extreme pain", "fever with tooth pain"]

RESPONSE STYLE:
- Use simple, compassionate language — patients may be anxious
- Structure answers: 1) Acknowledge concern, 2) Explain clearly, 3) Practical advice, 4) When to see a dentist
- Use bullet points for step-by-step instructions (using simple dashes - instead of asterisks)
- NEVER USE ASTERISKS (**) OR BOLDING. Use plain text only.
- Keep responses under 250 words unless a complex procedure needs detail
- Always end with a gentle reminder that a dentist should confirm any concerns
"""

def get_chat_model():
    api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY")
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=api_key,
        temperature=0.2,
        max_output_tokens=1024,
        streaming=True
    )

async def stream_chat_response(message: str, history: list):
    try:
        model = get_chat_model()
        messages = [SystemMessage(content=SYSTEM_PROMPT)]
        
        for msg in history:
            if msg.role == "user":
                messages.append(HumanMessage(content=msg.content))
            else:
                messages.append(AIMessage(content=msg.content))
                
        messages.append(HumanMessage(content=message))
        
        try:
            async for chunk in model.astream(messages):
                content = chunk.content
                
                # Properly extract text from LangChain/Gemini format
                text_part = ""
                if isinstance(content, str):
                    text_part = content
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            text_part += item.get("text", "")
                        elif isinstance(item, str):
                            text_part += item
                            
                if text_part:
                    print(f"AI: {text_part}", end="", flush=True) # Debug
                    yield f"data: {json.dumps({'token': text_part})}\n\n"
            print("\n[AI Finished]")
            yield "data: [DONE]\n\n"
        except Exception as e:
            print(f"\n[AI Error]: {e}")
            logger.error(f"Error in stream_chat_response: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    except Exception as e:
        logger.error(f"Error in stream_chat_response: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

async def analyze_symptoms(symptoms: list[str]) -> dict:
    model = get_chat_model()
    prompt = f"""
    Analyze these dental symptoms: {', '.join(symptoms)}.
    Respond in strict JSON format with exactly two keys:
    "ai_assessment": A brief, compassionate assessment of what might be happening (max 3 sentences). Do NOT use bolding or asterisks.
    "urgency_level": One of: "urgent", "soon", "monitor", "routine".
    """
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    
    # Extract text content (handle rich format)
    content = response.content
    text_content = ""
    if isinstance(content, str):
        text_content = content
    elif isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text_content += item.get("text", "")
            elif isinstance(item, str):
                text_content += item
    
    # Clean up any potential markdown/formatting the AI might have added
    text_content = text_content.replace('```json', '').replace('```', '').replace('*', '').strip()
    
    try:
        # Try to find the JSON part if there is preamble
        start = text_content.find('{')
        end = text_content.rfind('}') + 1
        if start != -1 and end != -1:
            return json.loads(text_content[start:end])
        return json.loads(text_content)
    except Exception:
        return {
            "ai_assessment": text_content,
            "urgency_level": "monitor"
        }
