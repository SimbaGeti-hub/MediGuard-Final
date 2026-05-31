import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import chat, sessions, profile, feedback, symptoms, medications, consultations
from app.routers import settings as settings_router
from app.routers import mental_health
from app.middleware.rate_limit import RateLimitMiddleware

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting — Phases 1–9 active")
    yield
    logger.info("🛑 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered healthcare navigation — Phases 1–9",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (add after CORS)
app.add_middleware(RateLimitMiddleware)


# ── Global error handler ────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."},
    )


# ── Routers ─────────────────────────────────────────────────────────────────
app.include_router(chat.router,              prefix="/api/chat",           tags=["Chat"])
app.include_router(sessions.router,          prefix="/api/sessions",       tags=["Sessions"])
app.include_router(profile.router,           prefix="/api/profile",        tags=["Profile"])
app.include_router(feedback.router,          prefix="/api/feedback",       tags=["Feedback"])
app.include_router(settings_router.router,   prefix="/api/settings",       tags=["Settings"])
app.include_router(mental_health.router,     prefix="/api/mental-health",  tags=["Mental Health"])
app.include_router(symptoms.router,          prefix="/api/symptoms",       tags=["Symptoms"])
app.include_router(medications.router,       prefix="/api/medications",    tags=["Medications"])
app.include_router(consultations.router,     prefix="/api/consultations",  tags=["Consultations"])


# ── Health & status endpoints ────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "phases": [
            "Phase 1 — Core Agent & Chat",
            "Phase 2 — Mental Health",
            "Phase 3 — Quality & Trust",
            "Phase 4 — Symptom Tracking",
            "Phase 5 — Medications",
            "Phase 6 — Health Dashboard",
            "Phase 7 — Pre-Consultation Reports",
            "Phase 8 — Multilingual (30 languages)",
            "Phase 9 — PWA, Emergency Response, Production Infra",
        ],
    }


@app.get("/api/status")
async def api_status():
    """Lightweight status check for uptime monitoring."""
    return {"ok": True}
