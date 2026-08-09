"""Contract tests for POST /api/sessions/{sessionId}/token."""


def test_token_success(client):
    res = client.post("/api/sessions/team-standup/token", json={"displayName": "Ada"})
    assert res.status_code == 200
    body = res.json()
    assert "token" in body and body["token"]
    assert body["livekitUrl"] == "wss://test.livekit.example"
    assert body["sessionId"] == "team-standup"
    assert body["identity"]


def test_token_empty_display_name(client):
    res = client.post("/api/sessions/team-standup/token", json={"displayName": "  "})
    assert res.status_code == 400
    body = res.json()
    assert body["error"] == "invalid_request"
    assert "displayName" in body["message"]


def test_token_invalid_session_id(client):
    res = client.post("/api/sessions/bad%20id!/token", json={"displayName": "Ada"})
    # Path with invalid chars may 404 from routing; use a path that reaches handler
    res = client.post("/api/sessions/bad.id/token", json={"displayName": "Ada"})
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_request"
