"""Application configuration loaded from environment variables / .env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve `.env` relative to `src/backend/` so loading works regardless of cwd.
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILE = _BACKEND_ROOT / ".env"

load_dotenv(_ENV_FILE, override=False)


class Settings(BaseSettings):
    """LiveKit credentials and service settings. Secrets never leave the process."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    livekit_url: str = Field(..., alias="LIVEKIT_URL")
    livekit_api_key: str = Field(..., alias="LIVEKIT_API_KEY")
    livekit_api_secret: str = Field(..., alias="LIVEKIT_API_SECRET")
    # Comma-separated browser origins allowed by CORS (e.g. local Vite + prod SPA host).
    frontend_origin: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174",
        alias="FRONTEND_ORIGIN",
    )
    token_ttl_seconds: int = Field(default=3600, alias="TOKEN_TTL_SECONDS")

    @property
    def livekit_configured(self) -> bool:
        return bool(self.livekit_url and self.livekit_api_key and self.livekit_api_secret)

    @property
    def cors_origins(self) -> list[str]:
        """Parsed FRONTEND_ORIGIN list; use ['*'] to allow any origin."""
        parts = [o.strip() for o in self.frontend_origin.split(",") if o.strip()]
        return parts or ["*"]


@lru_cache
def get_settings() -> Settings:
    """Load and cache settings. Raises ValidationError if required env vars are missing."""
    return Settings()  # type: ignore[call-arg]
