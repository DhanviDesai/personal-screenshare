"""LiveKit access token minting and verification."""

from __future__ import annotations

import datetime
import uuid
from dataclasses import dataclass

import jwt
from livekit import api

from app.config import Settings


@dataclass(frozen=True)
class MintedToken:
    token: str
    identity: str
    livekit_url: str
    session_id: str


class TokenVerificationError(Exception):
    """Raised when a bearer token is invalid, expired, or room-mismatched."""


def mint_access_token(
    settings: Settings,
    session_id: str,
    display_name: str,
) -> MintedToken:
    """Mint a short-lived LiveKit JWT scoped to one session and a generated identity."""
    identity = str(uuid.uuid4())
    token = (
        api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        .with_identity(identity)
        .with_name(display_name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=session_id,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
        .with_ttl(datetime.timedelta(seconds=settings.token_ttl_seconds))
        .to_jwt()
    )
    return MintedToken(
        token=token,
        identity=identity,
        livekit_url=settings.livekit_url,
        session_id=session_id,
    )


def verify_session_token(
    settings: Settings,
    session_id: str,
    authorization_header: str | None,
) -> str:
    """
    Validate Authorization: Bearer <livekit-token>.

    Returns the participant identity from the token's `sub` claim after verifying
    signature against LIVEKIT_API_SECRET and confirming the room claim matches session_id.
    """
    if not authorization_header or not authorization_header.startswith("Bearer "):
        raise TokenVerificationError("Missing or malformed Authorization header")

    raw = authorization_header[len("Bearer ") :].strip()
    if not raw:
        raise TokenVerificationError("Empty bearer token")

    try:
        claims = jwt.decode(
            raw,
            settings.livekit_api_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "iss"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenVerificationError("Token is invalid or expired") from exc

    if claims.get("iss") != settings.livekit_api_key:
        raise TokenVerificationError("Token issuer does not match API key")

    identity = claims.get("sub")
    if not identity or not isinstance(identity, str):
        raise TokenVerificationError("Token missing identity")

    video = claims.get("video") or {}
    room = video.get("room") if isinstance(video, dict) else None
    if room != session_id:
        raise TokenVerificationError("Token is not scoped to this session")

    return identity
