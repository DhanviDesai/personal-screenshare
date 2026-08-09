"""Unit tests for presenter lock store."""

from app.services.presenter_lock import PresenterLockStore


def test_try_acquire_and_release():
    store = PresenterLockStore()
    first = store.try_acquire("s1", "id-a", "Ada")
    assert first.granted is True
    second = store.try_acquire("s1", "id-b", "Bob")
    assert second.granted is False
    assert second.presenter_display_name == "Ada"
    assert store.release("s1", "id-b") is False
    assert store.release("s1", "id-a") is True
    assert store.current("s1") is None


def test_same_identity_reacquire():
    store = PresenterLockStore()
    store.try_acquire("s1", "id-a", "Ada")
    again = store.try_acquire("s1", "id-a", "Ada")
    assert again.granted is True


def test_release_if_holder_on_leave():
    store = PresenterLockStore()
    store.try_acquire("s1", "id-a", "Ada")
    assert store.release_if_holder("s1", "id-a") is True
    assert store.release_if_holder("s1", "id-a") is False
