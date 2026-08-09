"""Integration: late viewer sees current presenter via GET /presenter."""


def test_late_viewer_sees_presenter(client):
    a = client.post("/personal/screenshare/api/sessions/late-room/token", json={"displayName": "Early"}).json()
    client.post(
        "/personal/screenshare/api/sessions/late-room/screen-share/start",
        headers={"Authorization": f"Bearer {a['token']}"},
    )

    late = client.post("/personal/screenshare/api/sessions/late-room/token", json={"displayName": "Late"}).json()
    assert late["token"]

    presenter = client.get("/personal/screenshare/api/sessions/late-room/presenter").json()
    assert presenter["presenterDisplayName"] == "Early"
    assert presenter["presenterIdentity"] == a["identity"]
