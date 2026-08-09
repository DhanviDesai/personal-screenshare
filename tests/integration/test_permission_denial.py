"""
Integration placeholder for permission-denial UX.

Browser permission prompts cannot be exercised in pytest; the frontend hooks
map NotAllowedError to actionable StatusBanner messages (see useScreenShare /
useCameraMic). This test asserts the API still allows retry after a failed
start attempt that never acquired a lasting lock when auth is valid.
"""


def test_retry_after_failed_share_attempt_without_holding_lock(client):
    user = client.post("/api/sessions/perm-room/token", json={"displayName": "User"}).json()

    # Simulate client releasing immediately after a denied getDisplayMedia by not
    # calling start, then successfully calling start on retry.
    start = client.post(
        "/api/sessions/perm-room/screen-share/start",
        headers={"Authorization": f"Bearer {user['token']}"},
    )
    assert start.status_code == 200
    assert start.json()["granted"] is True
