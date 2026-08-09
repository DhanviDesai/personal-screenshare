# Backend API Contract: Screenshare Media Platform

**Feature**: `001-screenshare-platform` | **Date**: 2026-08-09

Base path: `/api` (FastAPI app in `src/backend/app/main.py`). All endpoints are JSON over HTTPS. No authentication beyond the open-join model (FR-001); the backend does not accept or store the LiveKit API secret from any client — it is read from environment variables server-side only (see `research.md`).

## `POST /api/sessions/{sessionId}/token`

Joins a session: mints a short-lived LiveKit access token for the given display name.

**Path params**:
- `sessionId` (string, required) — session identifier / LiveKit room name. Must be non-empty and URL-safe.

**Request body**:
```json
{
  "displayName": "Ada"
}
```
- `displayName` (string, required, non-empty) — FR-001, edge case validation.

**Response 200**:
```json
{
  "token": "<livekit-jwt>",
  "livekitUrl": "wss://your-livekit-host",
  "identity": "b3f1c2e0-...",
  "sessionId": "team-standup"
}
```

**Response 400** (validation failure — empty/invalid `sessionId` or `displayName`):
```json
{ "error": "invalid_request", "message": "displayName must not be empty" }
```

**Response 500** (LiveKit env not configured — fail-fast startup check should normally prevent this in production):
```json
{ "error": "server_misconfigured", "message": "LiveKit credentials are not configured" }
```

**Notes**: Maps to FR-001, FR-012. Logs a structured `session.join` event (constitution V / FR-013) including `sessionId`, `identity` (not `displayName`, to keep logs stable across duplicate names).

---

## Authentication for session-scoped calls

`screen-share/start`, `screen-share/stop`, and `leave` (below) act on behalf of a specific participant, so they MUST NOT trust a client-supplied identity string — that would let one participant spoof another's identity to hijack or release the presenter lock. Instead, these endpoints require:

**Headers**: `Authorization: Bearer <livekit-token>` — the exact token issued by this session's `POST /token` call.

The backend verifies the token's signature against `LIVEKIT_API_SECRET` (the same secret `config.py` already loads), confirms its room claim matches the `sessionId` path parameter, and takes `identity` from the token's `sub` claim. It never reads `identity` from the request body. An invalid, expired, or room-mismatched token yields:

**Response 401**:
```json
{ "error": "invalid_token", "message": "Token is invalid, expired, or not scoped to this session" }
```

This does not prevent a participant from reconnecting with a fresh token under a new identity (there are no accounts in v1 — see spec.md Assumptions); it only prevents spoofing another *currently connected* participant's identity.

---

## `POST /api/sessions/{sessionId}/screen-share/start`

Requests the single-presenter lock for screen sharing (FR-003a).

**Path params**: `sessionId` (string, required)

**Headers**: `Authorization: Bearer <livekit-token>` (see "Authentication for session-scoped calls" above)

**Request body**: none — `identity` is taken from the verified token.

**Response 200** (lock granted):
```json
{ "granted": true, "presenterIdentity": "b3f1c2e0-..." }
```

**Response 409** (already locked by someone else):
```json
{
  "granted": false,
  "error": "presenter_lock_held",
  "presenterIdentity": "9a02...",
  "presenterDisplayName": "Grace"
}
```

**Notes**: Maps to FR-003a, edge case "second user attempts to start screen share while another presenter's share is active." Frontend uses `presenterDisplayName` to render the blocking message. Logs a structured `screenshare.lock_denied` or `screenshare.lock_granted` event.

---

## `POST /api/sessions/{sessionId}/screen-share/stop`

Releases the presenter lock (explicit stop, or called internally on disconnect/leave).

**Headers**: `Authorization: Bearer <livekit-token>` (see "Authentication for session-scoped calls" above)

**Request body**: none — `identity` is taken from the verified token.

**Response 200**:
```json
{ "released": true }
```

**Response 409** (caller doesn't hold the lock — no-op safeguard):
```json
{ "released": false, "error": "not_current_presenter" }
```

---

## `POST /api/sessions/{sessionId}/leave`

Signals that a participant is leaving (called on explicit "Leave session" and as a best-effort beacon on LiveKit disconnect). Idempotent.

**Path params**: `sessionId` (string, required)

**Headers**: `Authorization: Bearer <livekit-token>` (see "Authentication for session-scoped calls" above)

**Request body**: none.

**Response 200**:
```json
{ "left": true, "lockReleased": false }
```
- `lockReleased` is `true` if this participant held the presenter lock and it was auto-released as a side effect (FR-003a cleanup).

**Notes**: Maps to FR-002, FR-013. Best-effort: the frontend calls this via `navigator.sendBeacon` or a fire-and-forget fetch on `beforeunload`/LiveKit disconnect, so failures here MUST NOT block the user from actually disconnecting from LiveKit. Logs a structured `session.leave` event including `lockReleased`. This is the formal contract for the beacon call referenced in the Error logging contract section below — it replaces the earlier informal mention of a "lightweight beacon call" with a defined path, auth, and response shape.

---

## `GET /api/sessions/{sessionId}/presenter`

Polls/queries current presenter state (used on join so a newly joined viewer's UI can reflect an in-progress share without racing the lock-start call — User Story 3 Scenario 1).

**Response 200**:
```json
{ "presenterIdentity": "b3f1c2e0-...", "presenterDisplayName": "Ada" }
```
or, when no one is presenting:
```json
{ "presenterIdentity": null, "presenterDisplayName": null }
```

---

## `GET /api/healthz`

Liveness/readiness check confirming LiveKit environment variables are present and the service is up (supports constitution V observability and ops sanity-checking; not user-facing).

**Response 200**:
```json
{ "status": "ok", "livekitConfigured": true }
```

---

## Error logging contract (applies to all endpoints)

Every request that results in a 4xx/5xx MUST emit one structured log line including: `event` name, `sessionId`, `identity` (if known), `status_code`, and `reason` — satisfying FR-013 / constitution V for join, leave, publish, subscribe, and error paths. Leave/disconnect logging is emitted via the `POST /api/sessions/{sessionId}/leave` beacon call defined above (fire-and-forget, best-effort from the frontend on explicit leave or LiveKit disconnect), or captured via backend-side LiveKit webhooks if configured later — v1 requires at minimum the frontend-triggered beacon.
