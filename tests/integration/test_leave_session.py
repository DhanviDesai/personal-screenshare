"""Integration: leave releases presenter lock for remaining participants."""


def test_leave_releases_lock(client):
    a = client.post("/api/sessions/leave-room/token", json={"displayName": "Ada"}).json()
    b = client.post("/api/sessions/leave-room/token", json={"displayName": "Bob"}).json()

    client.post(
        "/api/sessions/leave-room/screen-share/start",
        headers={"Authorization": f"Bearer {a['token']}"},
    )

    left = client.post(
        "/api/sessions/leave-room/leave",
        headers={"Authorization": f"Bearer {a['token']}"},
    )
    assert left.status_code == 200
    assert left.json()["left"] is True
    assert left.json()["lockReleased"] is True

    presenter = client.get("/api/sessions/leave-room/presenter").json()
    assert presenter["presenterIdentity"] is None

    # B can now acquire the lock
    start_b = client.post(
        "/api/sessions/leave-room/screen-share/start",
        headers={"Authorization": f"Bearer {b['token']}"},
    )
    assert start_b.status_code == 200
