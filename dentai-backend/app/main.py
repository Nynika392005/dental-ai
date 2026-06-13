import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.routers import (
    auth,
    chat as chat_router,
    education as education_router,
    appointments,
    symptom_checker as symptom_router,
    ai_analysis,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FIX-08: Rate limiting via slowapi
# Per-IP limits applied to auth and AI endpoints to prevent brute-force and
# AI cost-exhaustion attacks.
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Security-headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach hardened HTTP security headers to every response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "0"  # CSP is the modern standard
        response.headers["Content-Security-Policy"] = "default-src 'none'"
        # FIX-09: Enable HSTS in production to force HTTPS and prevent MITM.
        # In local development (ENVIRONMENT != "production") it is intentionally
        # left off so plain HTTP localhost works without browser complaints.
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        return response


# ---------------------------------------------------------------------------
# Request-size limiter middleware
# ---------------------------------------------------------------------------
MAX_JSON_BODY_BYTES = 1 * 1024 * 1024  # 1 MB for JSON endpoints


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized request bodies to prevent memory-exhaustion DoS."""

    async def dispatch(self, request: Request, call_next) -> Response:
        content_length = request.headers.get("content-length")
        # Skip size limit for the file-upload endpoint (it has its own 5 MB cap)
        if request.url.path.startswith("/analysis/"):
            return await call_next(request)
        if content_length and int(content_length) > MAX_JSON_BODY_BYTES:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request body too large. Maximum is 1 MB."},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DentAI API starting up (environment=%s)", settings.ENVIRONMENT)
    yield
    logger.info("DentAI API shutting down")


# ---------------------------------------------------------------------------
# FastAPI app
# FIX-10: OpenAPI docs disabled in production to avoid exposing the full API
# surface to unauthenticated callers. Enabled in development for convenience.
# ---------------------------------------------------------------------------
_is_production = settings.ENVIRONMENT == "production"

app = FastAPI(
    title="DentAI API",
    description="Backend for DentAI Patient Chatbot",
    version="1.0.0",
    lifespan=lifespan,
    # FIX-10: hide interactive docs in production
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

# FIX-08: Attach the rate-limiter state and exception handler to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Order matters: security headers and size limit run before CORS
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)

# SECURITY: restricted methods and headers; credentials only for listed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Conversation-Id"],
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
