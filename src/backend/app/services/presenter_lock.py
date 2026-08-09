"""In-memory single-presenter lock state per session."""

from __future__ import annotations

import threading
from dataclasses import dataclass


@dataclass
class PresenterLock:
    identity: str
    display_name: str


@dataclass
class AcquireResult:
    granted: bool
    presenter_identity: str | None = None
    presenter_display_name: str | None = None


class PresenterLockStore:
    """Thread-safe in-memory store of active screen-share presenters by sessionId."""

    def __init__(self) -> None:
        self._locks: dict[str, PresenterLock] = {}
        self._display_names: dict[str, str] = {}  # identity -> displayName
        self._mutex = threading.Lock()

    def remember_display_name(self, identity: str, display_name: str) -> None:
        with self._mutex:
            self._display_names[identity] = display_name

    def forget_display_name(self, identity: str) -> None:
        with self._mutex:
            self._display_names.pop(identity, None)

    def display_name_for(self, identity: str) -> str | None:
        with self._mutex:
            return self._display_names.get(identity)

    def try_acquire(self, session_id: str, identity: str, display_name: str) -> AcquireResult:
        with self._mutex:
            self._display_names[identity] = display_name
            current = self._locks.get(session_id)
            if current is None or current.identity == identity:
                self._locks[session_id] = PresenterLock(identity=identity, display_name=display_name)
                return AcquireResult(
                    granted=True,
                    presenter_identity=identity,
                    presenter_display_name=display_name,
                )
            return AcquireResult(
                granted=False,
                presenter_identity=current.identity,
                presenter_display_name=current.display_name,
            )

    def release(self, session_id: str, identity: str) -> bool:
        """Release lock if held by identity. Returns True if released."""
        with self._mutex:
            current = self._locks.get(session_id)
            if current is None:
                return False
            if current.identity != identity:
                return False
            del self._locks[session_id]
            return True

    def release_if_holder(self, session_id: str, identity: str) -> bool:
        """Idempotent release used on leave — True only when this identity held the lock."""
        return self.release(session_id, identity)

    def current(self, session_id: str) -> PresenterLock | None:
        with self._mutex:
            return self._locks.get(session_id)


# Process-wide singleton (ephemeral sessions; no DB).
presenter_lock_store = PresenterLockStore()
