"""Contract tests for screen-share start/stop endpoints."""


def _join(client, session_id: str, name: str) -> dict:
    res = client.post(f"/personal/screenshare/api/sessions/{session_id}/token", json={"displayName": name})
    assert res.status_code == 200
    return res.json()


def test_screen_share_grant_and_release(client):
    a = _join(client, "lock-room", "Ada")
    start = client.post(
        "/personal/screenshare/api/sessions/lock-room/screen-share/start",
        headers={"Authorization": f"Bearer {a['token']}"},
    )
    assert start.status_code == 200
    assert start.json()["granted"] is True
    assert start.json()["presenterIdentity"] == a["identity"]

    stop = client.post(
        "/personal/screenshare/api/sessions/lock-room/screen-share/stop",
        headers={"Authorization": f"Bearer {a['token']}"},
    )
    assert stop.status_code == 200
    assert stop.json()["released"] is True


def test_screen_share_conflict(client):
    a = _join(client, "lock-room-2", "Ada")
    b = _join(client, "lock-room-2", "Grace")

    first = client.post(
        "/personal/screenshare/api/sessions/lock-room-2/screen-share/start",
        headers={"Authorization": f"Bearer {a['token']}"},
    )
    assert first.status_code == 200

    second = client.post(
        "/personal/screenshare/api/sessions/lock-room-2/screen-share/start",
        headers={"Authorization": f"Bearer {b['token']}"},
    )
    assert second.status_code == 409
    body = second.json()
    assert body["error"] == "presenter_lock_held"
    assert body["presenterDisplayName"] == "Ada"
    assert body["presenterIdentity"] == a["identity"]


def test_screen_share_requires_auth(client):
    res = client.post("/personal/screenshare/api/sessions/lock-room-3/screen-share/start")
    assert res.status_code == 401
    assert res.json()["error"] == "invalid_token"
