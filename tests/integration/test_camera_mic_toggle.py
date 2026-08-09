"""Integration: camera/mic independence is a client concern; server leaves lock intact."""


def test_screen_share_lock_unaffected_by_other_participants(client):
    a = client.post("/personal/screenshare/api/sessions/cam-room/token", json={"displayName": "A"}).json()
    b = client.post("/personal/screenshare/api/sessions/cam-room/token", json={"displayName": "B"}).json()

    start = client.post(
        "/personal/screenshare/api/sessions/cam-room/screen-share/start",
        headers={"Authorization": f"Bearer {a['token']}"},
    )
    assert start.status_code == 200

    # B "toggles camera/mic" without touching the lock — only A can release.
    leave_b = client.post(
        "/personal/screenshare/api/sessions/cam-room/leave",
        headers={"Authorization": f"Bearer {b['token']}"},
    )
    assert leave_b.status_code == 200
    assert leave_b.json()["lockReleased"] is False

    still = client.get("/personal/screenshare/api/sessions/cam-room/presenter").json()
    assert still["presenterIdentity"] == a["identity"]
