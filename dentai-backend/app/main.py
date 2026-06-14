import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
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
# Security-headers middleware
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Security-headers middleware
# ---------------------------------------------------------------------------
class SecurityHeadersMiddleware:
    """Attach hardened HTTP security headers to every response."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing_headers = {k.lower() for k, v in headers}
                
                new_headers = []
                if b"x-content-type-options" not in existing_headers:
                    new_headers.append((b"x-content-type-options", b"nosniff"))
                if b"x-frame-options" not in existing_headers:
                    new_headers.append((b"x-frame-options", b"DENY"))
                if b"referrer-policy" not in existing_headers:
                    new_headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                if b"x-xss-protection" not in existing_headers:
                    new_headers.append((b"x-xss-protection", b"0"))
                if b"content-security-policy" not in existing_headers:
                    new_headers.append((b"content-security-policy", b"default-src 'none'"))
                
                if settings.ENVIRONMENT == "production":
                    if b"strict-transport-security" not in existing_headers:
                        new_headers.append((b"strict-transport-security", b"max-age=63072000; includeSubDomains; preload"))
                
                headers.extend(new_headers)
                message["headers"] = headers
            
            await send(message)

        await self.app(scope, receive, send_wrapper)


# ---------------------------------------------------------------------------
# Request-size limiter middleware
# ---------------------------------------------------------------------------
MAX_JSON_BODY_BYTES = 1 * 1024 * 1024  # 1 MB for JSON endpoints


class RequestSizeLimitMiddleware:
    """Reject oversized request bodies to prevent memory-exhaustion DoS."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        # Skip size limit for the file-upload endpoint (it has its own 2 MB cap)
        if path.startswith("/analysis/"):
            await self.app(scope, receive, send)
            return

        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        
        from fastapi.responses import JSONResponse
        if content_length:
            try:
                length = int(content_length.decode("utf-8"))
                if length > MAX_JSON_BODY_BYTES:
                    response = JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large. Maximum is 1 MB."},
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        await self.app(scope, receive, send)


# ---------------------------------------------------------------------------
# Application lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DentAI API starting up (environment=%s)", settings.ENVIRONMENT)
    try:
        from app.core.database import check_db_connection
        db = await check_db_connection()
        # Create unique compound index: dentist_id + scheduled_at where status in ('scheduled', 'confirmed')
        await db["appointments"].create_index(
            [("dentist_id", 1), ("scheduled_at", 1)],
            unique=True,
            partialFilterExpression={"status": {"$in": ["scheduled", "confirmed"]}}
        )
        logger.info("Created atomic booking compound index successfully.")
    except Exception as e:
        logger.error("Failed to create atomic booking compound index: %s", e)
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

# ---------------------------------------------------------------------------
# NoSQL Injection Hardening (Operator Injection prevention WAF middleware)
# Rejects requests with dict keys starting with $ (e.g. $ne, $gt, $regex, etc.)
# ---------------------------------------------------------------------------
class NoSQLInjectionMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Check query parameters
        from urllib.parse import parse_qsl
        from fastapi.responses import JSONResponse
        
        query_string = scope.get("query_string", b"").decode("utf-8")
        for key, val in parse_qsl(query_string):
            if key.startswith("$"):
                response = JSONResponse(
                    status_code=400,
                    content={"detail": "Invalid operator key in query parameters."}
                )
                await response(scope, receive, send)
                return

        # Check JSON body if content-type is json
        headers = {k.lower(): v for k, v in scope.get("headers", [])}
        content_type = headers.get(b"content-type", b"").decode("utf-8")
        if "application/json" in content_type:
            body_chunks = []
            more_body = True
            while more_body:
                message = await receive()
                if message["type"] == "http.request":
                    body_chunks.append(message.get("body", b""))
                    more_body = message.get("more_body", False)
                elif message["type"] == "http.disconnect":
                    return

            body_bytes = b"".join(body_chunks)
            if body_bytes:
                try:
                    import json
                    body_json = json.loads(body_bytes)
                    if self._contains_nosql_operators(body_json):
                        response = JSONResponse(
                            status_code=400,
                            content={"detail": "Invalid operator key in request body."}
                        )
                        await response(scope, receive, send)
                        return
                except Exception:
                    pass

            received_body = False
            async def new_receive():
                nonlocal received_body
                if not received_body:
                    received_body = True
                    return {"type": "http.request", "body": body_bytes, "more_body": False}
                else:
                    return await receive()

            await self.app(scope, new_receive, send)
        else:
            await self.app(scope, receive, send)

    def _contains_nosql_operators(self, data) -> bool:
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(k, str) and k.startswith("$"):
                    return True
                if self._contains_nosql_operators(v):
                    return True
        elif isinstance(data, list):
            for item in data:
                if self._contains_nosql_operators(item):
                    return True
        return False

app.add_middleware(NoSQLInjectionMiddleware)

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
