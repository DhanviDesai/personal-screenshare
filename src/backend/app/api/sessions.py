"""Session token, presenter-lock, and leave endpoints."""

from __future__ import annotations

import logging
import re
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse

from app.config import Settings, get_settings
from app.models.schemas import (
    ErrorResponse,
    LeaveResponse,
    PresenterResponse,
    ScreenShareLockResponse,
    ScreenShareStopResponse,
    TokenRequest,
    TokenResponse,
)
from app.services.livekit_tokens import (
    TokenVerificationError,
    mint_access_token,
    verify_session_token,
)
from app.services.logging_utils import log_event
from app.services.presenter_lock import presenter_lock_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sessions", tags=["sessions"])

SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _invalid_request(message: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "invalid_request", "message": message},
    )


def _validate_session_id(session_id: str) -> JSONResponse | None:
    if not session_id or not SESSION_ID_RE.match(session_id):
        return _invalid_request("sessionId is empty or invalid")
    return None


def _validate_display_name(display_name: str) -> tuple[str | None, JSONResponse | None]:
    cleaned = display_name.strip()
    if not cleaned:
        return None, _invalid_request("displayName must not be empty")
    return cleaned, None


def _identity_from_auth(
    settings: Settings,
    session_id: str,
    authorization: str | None,
) -> tuple[str | None, JSONResponse | None]:
    try:
        return verify_session_token(settings, session_id, authorization), None
    except TokenVerificationError as exc:
        log_event(
            logger,
            "error",
            sessionId=session_id,
            status_code=401,
            reason=str(exc),
        )
        return None, JSONResponse(
            status_code=401,
            content={
                "error": "invalid_token",
                "message": "Token is invalid, expired, or not scoped to this session",
            },
        )


@router.post(
    "/{session_id}/token",
    response_model=TokenResponse,
    response_model_by_alias=True,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
def create_token(
    session_id: str,
    body: TokenRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse | JSONResponse:
    bad = _validate_session_id(session_id)
    if bad:
        return bad
    display_name, err = _validate_display_name(body.display_name)
    if err or display_name is None:
        return err  # type: ignore[return-value]

    if not settings.livekit_configured:
        log_event(
            logger,
            "error",
            sessionId=session_id,
            status_code=500,
            reason="LiveKit credentials are not configured",
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": "server_misconfigured",
                "message": "LiveKit credentials are not configured",
            },
        )

    minted = mint_access_token(settings, session_id, display_name)
    presenter_lock_store.remember_display_name(minted.identity, display_name)
    log_event(
        logger,
        "session.join",
        sessionId=session_id,
        identity=minted.identity,
    )
    return TokenResponse(
        token=minted.token,
        livekitUrl=minted.livekit_url,
        identity=minted.identity,
        sessionId=minted.session_id,
    )


@router.post(
    "/{session_id}/screen-share/start",
    response_model=ScreenShareLockResponse,
    response_model_by_alias=True,
)
def screen_share_start(
    session_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> ScreenShareLockResponse | JSONResponse:
    bad = _validate_session_id(session_id)
    if bad:
        return bad
    identity, auth_err = _identity_from_auth(settings, session_id, authorization)
    if auth_err or identity is None:
        return auth_err  # type: ignore[return-value]

    display_name = presenter_lock_store.display_name_for(identity) or identity
    result = presenter_lock_store.try_acquire(session_id, identity, display_name)
    if result.granted:
        log_event(
            logger,
            "screenshare.lock_granted",
            sessionId=session_id,
            identity=identity,
        )
        return ScreenShareLockResponse(
            granted=True,
            presenterIdentity=identity,
        )

    log_event(
        logger,
        "screenshare.lock_denied",
        sessionId=session_id,
        identity=identity,
        presenterIdentity=result.presenter_identity,
        status_code=409,
        reason="presenter_lock_held",
    )
    return JSONResponse(
        status_code=409,
        content={
            "granted": False,
            "error": "presenter_lock_held",
            "presenterIdentity": result.presenter_identity,
            "presenterDisplayName": result.presenter_display_name,
        },
    )


@router.post(
    "/{session_id}/screen-share/stop",
    response_model=ScreenShareStopResponse,
)
def screen_share_stop(
    session_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> ScreenShareStopResponse | JSONResponse:
    bad = _validate_session_id(session_id)
    if bad:
        return bad
    identity, auth_err = _identity_from_auth(settings, session_id, authorization)
    if auth_err or identity is None:
        return auth_err  # type: ignore[return-value]

    released = presenter_lock_store.release(session_id, identity)
    if released:
        return ScreenShareStopResponse(released=True)

    log_event(
        logger,
        "error",
        sessionId=session_id,
        identity=identity,
        status_code=409,
        reason="not_current_presenter",
    )
    return JSONResponse(
        status_code=409,
        content={"released": False, "error": "not_current_presenter"},
    )


@router.get(
    "/{session_id}/presenter",
    response_model=PresenterResponse,
    response_model_by_alias=True,
)
def get_presenter(session_id: str) -> PresenterResponse | JSONResponse:
    bad = _validate_session_id(session_id)
    if bad:
        return bad
    current = presenter_lock_store.current(session_id)
    if current is None:
        return PresenterResponse(presenterIdentity=None, presenterDisplayName=None)
    return PresenterResponse(
        presenterIdentity=current.identity,
        presenterDisplayName=current.display_name,
    )


@router.post(
    "/{session_id}/leave",
    response_model=LeaveResponse,
    response_model_by_alias=True,
)
def leave_session(
    session_id: str,
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header()] = None,
) -> LeaveResponse | JSONResponse:
    bad = _validate_session_id(session_id)
    if bad:
        return bad
    identity, auth_err = _identity_from_auth(settings, session_id, authorization)
    if auth_err or identity is None:
        return auth_err  # type: ignore[return-value]

    lock_released = presenter_lock_store.release_if_holder(session_id, identity)
    presenter_lock_store.forget_display_name(identity)
    log_event(
        logger,
        "session.leave",
        sessionId=session_id,
        identity=identity,
        lockReleased=lock_released,
    )
    return LeaveResponse(left=True, lockReleased=lock_released)
