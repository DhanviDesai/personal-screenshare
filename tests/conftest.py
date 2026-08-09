"""Shared pytest fixtures for backend tests."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

# Must be set before importing the app so Settings can load.
os.environ.setdefault("LIVEKIT_URL", "wss://test.livekit.example")
os.environ.setdefault("LIVEKIT_API_KEY", "testkey_abcdefghijklmnopqrstuvwxyz012345")
os.environ.setdefault("LIVEKIT_API_SECRET", "testsecret_abcdefghijklmnopqrstuvwxyz0123456789")
os.environ.setdefault("SKIP_ENV_VALIDATION", "1")


@pytest.fixture(autouse=True)
def _reset_settings_and_locks():
    from app.config import get_settings
    from app.services.presenter_lock import presenter_lock_store

    get_settings.cache_clear()
    presenter_lock_store._locks.clear()
    presenter_lock_store._display_names.clear()
    yield
    get_settings.cache_clear()
    presenter_lock_store._locks.clear()
    presenter_lock_store._display_names.clear()


@pytest.fixture
def client() -> TestClient:
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture
def settings():
    from app.config import get_settings

    get_settings.cache_clear()
    return get_settings()
