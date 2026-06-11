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

@app.get("/test")
async def test():
    return {"message": "Server is reachable", "version": "fallback_v1"}

