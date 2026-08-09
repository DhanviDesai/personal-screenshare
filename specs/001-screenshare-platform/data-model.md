# Phase 1 Data Model: Screenshare Media Platform

**Feature**: `001-screenshare-platform` | **Date**: 2026-08-09

No database is used (spec Storage: none; sessions are ephemeral). Entities below are in-memory/runtime concepts, mapped to LiveKit room/participant/track primitives plus a small amount of backend-held state for the single-presenter lock.

## Entities

### Session

Represents a named, ephemeral realtime gathering (maps 1:1 to a LiveKit room).

| Field | Type | Notes |
|---|---|---|
| `sessionId` | string | Identifier used in the URL and by the frontend/backend; also used as the LiveKit room name. Non-empty; validated per FR-001/edge case (empty/invalid blocked at join). |
| `activePresenterIdentity` | string \| null | Participant identity currently holding the screen-share lock (FR-003a). `null` when no active share. Held in backend in-memory state, keyed by `sessionId`. |
| `createdAt` | timestamp | First-join time; used only for logging/observability (constitution V), not persisted beyond process lifetime. |

**Lifecycle**: Created implicitly on first successful join (LiveKit room auto-created on first participant connect). Ceases to have meaningful state when the last participant leaves (ephemeral — Clarifications session 2026-08-09). No explicit "end session" action exists in v1.

**Validation rules**:
- `sessionId` MUST be non-empty and pass basic format validation (safe characters for a URL path segment) before a join/token request is accepted; otherwise the request is rejected with a validation error (edge case: "Empty or invalid session name").

### Participant

Represents a person present in a Session (maps to a LiveKit `Participant`/`identity`).

| Field | Type | Notes |
|---|---|---|
| `identity` | string | Server-generated unique per-connection identifier (e.g., UUID), distinct from `displayName`. Used as the LiveKit participant identity so duplicate display names (Clarifications) don't collide at the transport layer. |
| `displayName` | string | User-supplied label shown to other participants (FR-010). Not required to be unique within a session. |
| `sessionId` | string | The Session this participant belongs to. |
| `isPresenter` | boolean (derived) | True when `identity == Session.activePresenterIdentity`. |

**Lifecycle**: Created on join (token issuance), removed on explicit leave or LiveKit disconnect (FR-002). No persistence across reconnects; a rejoin creates a new `identity`.

**Validation rules**:
- `displayName` MUST be non-empty (edge case: "Empty or invalid ... display name").

### Media stream

Represents a published track: screen video, screen audio, camera video, or microphone audio (maps to LiveKit `Track`/`TrackPublication`).

| Field | Type | Notes |
|---|---|---|
| `kind` | enum: `screen_video`, `screen_audio`, `camera_video`, `microphone_audio` | Distinguishes the four first-class media paths (FR-003–FR-007). |
| `ownerIdentity` | string | The publishing Participant's `identity`. |
| `sessionId` | string | The Session this track is published into. |
| `available` | boolean | For `screen_audio` specifically: `false` when the browser/platform couldn't provide share audio (FR-005); drives the "audio unavailable" status (SC-003). Always `true` for the other kinds once published. |

**Lifecycle**: Created when the user starts sharing/enables camera or mic; removed when they stop/disable, leave, or disconnect (FR-008, User Story 1 Scenario 4). `screen_video`/`screen_audio` for a given session can only exist for the one participant holding the presenter lock (FR-003a).

**Validation rules**:
- A `screen_video`/`screen_audio` publish request is rejected (409-equivalent) if another participant already holds the presenter lock for that session.

### Session access grant

Represents the short-lived permission that lets a Participant join and publish/subscribe in a specific Session (maps to a LiveKit JWT access token minted by the backend).

| Field | Type | Notes |
|---|---|---|
| `token` | string (JWT) | Issued by backend via `livekit-api`; scoped to one `sessionId` (room) and one `identity`; short expiry. |
| `livekitUrl` | string | The LiveKit server WebSocket URL the frontend connects to; returned alongside the token so the client never needs its own copy of server config. |
| `identity` | string | The participant identity the token is bound to. |
| `expiresAt` | timestamp (derived from token) | Enforced by LiveKit server itself; backend doesn't track this separately. |

**Lifecycle**: Minted per join request (FR-012); not stored server-side beyond issuance (stateless — LiveKit validates the JWT itself). Re-minted on rejoin/retry (User Story 4 Scenario 3).

## Relationships

```text
Session (1) ──── (0..4) Participant
Participant (1) ──── (0..4) Media stream   [screen_video, screen_audio, camera_video, microphone_audio — at most 1 active per kind]
Session (1) ──── (0..1) "active presenter" Participant   [via activePresenterIdentity]
Participant (1) ──── (1) Session access grant per join/rejoin
```

## State transitions

**Session**: `nonexistent` → `active` (first join) → `nonexistent` (last participant leaves; ephemeral, no persisted "ended" state).

**Presenter lock** (`Session.activePresenterIdentity`): `null` → `<identity>` (on accepted `screen-share/start`) → `null` (on `screen-share/stop`, presenter leave/disconnect, or presenter's connection drop).

**Media stream**: `unpublished` → `published` (`available=true|false` for screen_audio) → `unpublished` (stop/disable/leave).
