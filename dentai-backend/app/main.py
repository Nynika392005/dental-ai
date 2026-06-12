from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.routers import auth, chat as chat_router, education as education_router, appointments, symptom_checker as symptom_router, ai_analysis

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lifespan operations (MongoDB Atlas needs no table creation)
    yield

app = FastAPI(
    title="DentAI API",
    description="Backend for DentAI Patient Chatbot",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat_router.router)
app.include_router(education_router.router)
app.include_router(appointments.router)
app.include_router(symptom_router.router)
app.include_router(ai_analysis.router)

@app.get("/")
async def root():
    return {"message": "Welcome to DentAI API", "status": "online"}

@app.get("/test-ai")
async def test_ai():
    """Test endpoint to verify AI SDK and model access"""
    import os
    from app.core.config import settings
    api_key = os.getenv("GOOGLE_API_KEY") or settings.GOOGLE_API_KEY
    key_preview = f"{api_key[:8]}..." if api_key and len(api_key) > 8 else "NOT SET"
    
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents="Say hello in one word."
        )
        return {"status": "ok", "key_preview": key_preview, "response": response.text, "sdk": "google-genai"}
    except Exception as e:
        return {"status": "error", "key_preview": key_preview, "error": str(e), "sdk": "google-genai"}

