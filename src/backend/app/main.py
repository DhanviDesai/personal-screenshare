"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.sessions import router as sessions_router
from app.config import get_settings
from app.models.schemas import HealthResponse
from app.services.logging_utils import configure_logging, log_event

configure_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Screenshare Media Platform", version="0.1.0")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Map Pydantic 422s to contract-shaped 400 invalid_request responses."""
    message = "invalid request"
    for err in exc.errors():
        loc = err.get("loc") or ()
        if "displayName" in loc or "display_name" in loc:
            message = "displayName must not be empty"
            break
        if "sessionId" in loc or "session_id" in loc:
            message = "sessionId is empty or invalid"
            break
        if err.get("msg"):
            message = str(err["msg"])
            break
    return JSONResponse(
        status_code=400,
        content={"error": "invalid_request", "message": message},
    )


def _cors_origins() -> list[str]:
    try:
        settings = get_settings()
        return [settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]
    except ValidationError:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Nested under /personal/screenshare so the SPA can own assets/routes there.
API_PREFIX = "/personal/screenshare/api"

app.include_router(sessions_router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/healthz", response_model=HealthResponse, response_model_by_alias=True)
def healthz() -> HealthResponse:
    try:
        settings = get_settings()
        configured = settings.livekit_configured
    except ValidationError:
        configured = False
        log_event(
            logger,
            "error",
            status_code=200,
            reason="LiveKit env vars missing at health check",
        )
    return HealthResponse(status="ok", livekitConfigured=configured)


@app.on_event("startup")
def validate_env_on_startup() -> None:
    """Fail fast if LiveKit credentials are missing (skipped when SKIP_ENV_VALIDATION=1)."""
    if os.environ.get("SKIP_ENV_VALIDATION") == "1":
        return
    try:
        settings = get_settings()
        if not settings.livekit_configured:
            raise RuntimeError("LiveKit credentials are incomplete")
        logger.info(
            "startup_ok",
            extra={
                "structured": {
                    "event": "startup",
                    "livekitConfigured": True,
                    "livekitUrlConfigured": bool(settings.livekit_url),
                }
            },
        )
    except (ValidationError, RuntimeError) as exc:
        log_event(logger, "error", reason=f"LiveKit env validation failed: {exc}")
        raise RuntimeError(
            "Missing required environment variables: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
        ) from exc
