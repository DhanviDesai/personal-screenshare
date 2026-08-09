# Quickstart: Screenshare Media Platform

**Feature**: `001-screenshare-platform` | **Date**: 2026-08-09

This guide validates the feature end-to-end once implemented. It assumes `src/frontend`, `src/backend`, and `tests/` exist per `plan.md`'s Project Structure.

## Prerequisites

- Node.js 20+ and a package manager (`npm`) for `src/frontend`.
- Python 3.11+ for `src/backend`, with a local `.venv` virtual environment (per plan Technical Context — do not install backend deps globally).
- A LiveKit server you can reach (LiveKit Cloud project, or a local `livekit-server` instance) and its URL + API key/secret.
- The following environment variables set in the shell that runs the backend (never committed to source control):
  - `LIVEKIT_URL` (e.g., `wss://your-project.livekit.cloud`)
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`

## Setup

```bash
# Backend: create and use a local virtual environment
cd src/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Run

```bash
# Terminal 1 — backend (from src/backend, with .venv activated, env vars exported)
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=...
export LIVEKIT_API_SECRET=...
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd src/frontend
npm run dev
```

Confirm the backend is healthy: `curl http://localhost:8000/api/healthz` → `{"status":"ok","livekitConfigured":true}` (see `contracts/backend-api.md`).

## Validation scenarios

Run these manually (or automate as integration tests under `tests/integration`) to confirm the feature meets the spec's acceptance scenarios and success criteria.

### 1. Join and screen share with audio (User Story 1 / SC-001, SC-002, SC-003)

1. Open the frontend in two browser windows/profiles (e.g., Chrome).
2. In window A, enter the same session ID (e.g., `demo-session`) and a display name, then join.
3. In window B, enter the same session ID with a different display name, then join.
4. In window A, start screen share and choose "share tab audio" (or system audio) when prompted.
5. **Expect**: Window B sees A's screen video and hears A's audio within a few seconds. If the browser doesn't offer audio capture for the chosen source, window A shows an "audio unavailable" status within 3 seconds and window B still sees video only.
6. Stop sharing in window A. **Expect**: window B's view of A's screen disappears promptly and the UI reflects sharing has ended.

### 2. Camera and microphone are independent (User Story 2 / SC-004)

1. With both windows still joined, enable camera and microphone in window B.
2. **Expect**: window A sees B's camera video and hears B's mic audio within 3 seconds.
3. Disable camera in window B only. **Expect**: window A stops seeing B's video but still hears B's mic; window A's screen share (if still active) is unaffected.

### 3. Late viewer sees ongoing share (User Story 3 / SC-005)

1. With window A actively screen sharing, open a third browser window (C) and join the same session.
2. **Expect**: window C sees A's ongoing screen share (and audio, if present) within 10 seconds of completing join, without A needing to restart sharing.
3. Have A leave the session. **Expect**: windows B and C no longer see A as present, and A's media disappears.

### 4. Single-presenter lock (FR-003a)

1. With window A actively screen sharing, attempt to start screen share in window B.
2. **Expect**: window B's attempt is blocked with a message naming A as the current presenter (see `contracts/backend-api.md` `POST /screen-share/start` → 409 `presenter_lock_held`).
3. Stop A's share, then retry in window B. **Expect**: window B is granted the lock and can now share.

### 5. Permission denial and retry (User Story 4)

1. In a fresh window, deny the browser's screen-share (or camera/mic) permission prompt when attempting to publish.
2. **Expect**: a clear, actionable error message is shown (not a silent failure).
3. Grant permission and retry. **Expect**: the share/publish succeeds without requiring a full page reload.

### 6. Capacity smoke check (SC-007)

1. Join the same session from 4 browser windows/profiles.
2. Have at least one presenter share screen, and 1–2 others enable camera/mic.
3. **Expect**: all media remains responsive and within the latency targets above with 4 concurrent participants.

## Automated coverage pointers

- `tests/contract/` — backend endpoint contracts from `contracts/backend-api.md` (token issuance, lock start/stop/state, validation errors).
- `tests/unit/` — backend token-minting and lock-state service logic; frontend hooks (`useLiveKitRoom`, `useScreenShare`, `useCameraMic`) and components.
- `tests/integration/` — multi-client join/share/leave flows approximating the manual scenarios above.
