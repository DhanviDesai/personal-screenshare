"""
Integration-style API flow: join → acquire screen-share lock → release.

Full browser media capture against a live LiveKit server is covered by
quickstart.md manual scenarios; this test validates the server-side join/share
contract path that those scenarios depend on.
"""


def test_join_and_share_lock_flow(client):
    presenter = client.post(
        "/api/sessions/demo-session/token", json={"displayName": "Presenter"}
    ).json()
    viewer = client.post(
        "/api/sessions/demo-session/token", json={"displayName": "Viewer"}
    ).json()

    start = client.post(
        "/api/sessions/demo-session/screen-share/start",
        headers={"Authorization": f"Bearer {presenter['token']}"},
    )
    assert start.status_code == 200

    state = client.get("/api/sessions/demo-session/presenter")
    assert state.status_code == 200
    assert state.json()["presenterDisplayName"] == "Presenter"
    assert state.json()["presenterIdentity"] == presenter["identity"]

    denied = client.post(
        "/api/sessions/demo-session/screen-share/start",
        headers={"Authorization": f"Bearer {viewer['token']}"},
    )
    assert denied.status_code == 409

    stop = client.post(
        "/api/sessions/demo-session/screen-share/stop",
        headers={"Authorization": f"Bearer {presenter['token']}"},
    )
    assert stop.status_code == 200

    after = client.get("/api/sessions/demo-session/presenter").json()
    assert after["presenterIdentity"] is None
