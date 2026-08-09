"""Unit tests for LiveKit token minting and verification."""

import pytest

from app.services.livekit_tokens import (
    TokenVerificationError,
    mint_access_token,
    verify_session_token,
)


def test_mint_and_verify(settings):
    minted = mint_access_token(settings, "room-1", "Ada")
    identity = verify_session_token(
        settings, "room-1", f"Bearer {minted.token}"
    )
    assert identity == minted.identity


def test_verify_rejects_wrong_room(settings):
    minted = mint_access_token(settings, "room-1", "Ada")
    with pytest.raises(TokenVerificationError):
        verify_session_token(settings, "other-room", f"Bearer {minted.token}")


def test_verify_rejects_missing_header(settings):
    with pytest.raises(TokenVerificationError):
        verify_session_token(settings, "room-1", None)


def test_minted_token_does_not_embed_secret(settings):
    minted = mint_access_token(settings, "room-1", "Ada")
    assert settings.livekit_api_secret not in minted.token
    assert settings.livekit_api_secret not in minted.livekit_url
