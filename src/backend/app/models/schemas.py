"""Pydantic request/response schemas for the backend API."""

from pydantic import BaseModel, Field, field_validator


class TokenRequest(BaseModel):
    display_name: str = Field(..., alias="displayName")

    model_config = {"populate_by_name": True}

    @field_validator("display_name")
    @classmethod
    def non_empty_display_name(cls, value: str) -> str:
        if value is None or not str(value).strip():
            # Raise ValueError so FastAPI can map; sessions endpoint also strips.
            raise ValueError("displayName must not be empty")
        return value


class TokenResponse(BaseModel):
    token: str
    livekit_url: str = Field(..., alias="livekitUrl")
    identity: str
    session_id: str = Field(..., alias="sessionId")

    model_config = {"populate_by_name": True}


class ScreenShareLockRequest(BaseModel):
    """Empty body — identity comes from the Authorization bearer token."""

    model_config = {"extra": "forbid"}


class ScreenShareLockResponse(BaseModel):
    granted: bool
    presenter_identity: str | None = Field(default=None, alias="presenterIdentity")
    presenter_display_name: str | None = Field(default=None, alias="presenterDisplayName")
    error: str | None = None

    model_config = {"populate_by_name": True}


class ScreenShareStopResponse(BaseModel):
    released: bool
    error: str | None = None


class PresenterResponse(BaseModel):
    presenter_identity: str | None = Field(default=None, alias="presenterIdentity")
    presenter_display_name: str | None = Field(default=None, alias="presenterDisplayName")

    model_config = {"populate_by_name": True}


class LeaveResponse(BaseModel):
    left: bool = True
    lock_released: bool = Field(..., alias="lockReleased")

    model_config = {"populate_by_name": True}


class ErrorResponse(BaseModel):
    error: str
    message: str


class HealthResponse(BaseModel):
    status: str
    livekit_configured: bool = Field(..., alias="livekitConfigured")

    model_config = {"populate_by_name": True}
