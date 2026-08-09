# Implementation Plan: Screenshare Media Platform

**Branch**: `001-screenshare-platform` | **Date**: 2026-08-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-screenshare-platform/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A LiveKit-based realtime session platform where up to 4 participants join by session ID + display name (open join, no auth), share screen video with audio when the browser allows it, and independently publish camera/microphone. Screen share is single-presenter-locked; sessions are ephemeral. Frontend is a Vite + React SPA owning browser capture and the LiveKit client session; backend is a Python FastAPI service whose only privileged job is minting short-lived LiveKit access tokens and exposing minimal room-state/config endpoints, reading LiveKit credentials from environment variables (never committed, never sent to the client).

## Technical Context

**Language/Version**: TypeScript (Vite + React 18 frontend); Python 3.11+ (FastAPI backend)

**Primary Dependencies**: `livekit-client` (browser SDK) + React on the frontend; `fastapi`, `uvicorn`, `livekit-api` (server SDK for token minting) on the backend

**Storage**: None — sessions are ephemeral in-memory/LiveKit-native state; no database. The backend holds no session table; LiveKit room existence is the source of truth for "who is in a session."

**Testing**: `pytest` for backend (token minting, config/env validation, single-presenter-lock endpoint logic) and Vitest + React Testing Library for frontend unit/component tests; both invoked from repository-root `tests/` (`tests/unit`, `tests/integration`, `tests/contract`)

**Target Platform**: Modern desktop browsers (Chromium-based primary target, per spec Assumptions) for full capture-with-audio; backend runs as a standalone FastAPI service in a Python virtual environment (`.venv`)

**Project Type**: Web application (`src/frontend` + `src/backend`)

**Performance Goals**: Join-to-participant-visible within a few seconds (SC-001); camera/mic toggle reflected remotely within 3s (SC-004); new viewer sees ongoing share within 10s of join (SC-005); audio-unavailable status surfaced within 3s of share start (SC-003)

**Constraints**: LiveKit-only media plane (constitution I); LiveKit API key/secret/URL MUST be read from server-side environment variables at process startup — never hardcoded, never returned to the client (constitution: Secrets + explicit user directive); Python backend dependencies MUST be managed in a local `.venv` virtual environment (explicit user directive); single-presenter lock for screen share enforced server-side to avoid trusting client-only enforcement; session capacity target ~4 concurrent participants (SC-007)

**Scale/Scope**: Small sessions, up to ~4 concurrent participants per LiveKit room; no cross-session or multi-tenant concerns; no persistence layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.specify/memory/constitution.md` (LiveKit Screenshare Constitution v1.0.0):

- [x] Realtime screen/video/audio uses LiveKit only (no alternate media plane)
- [x] Frontend changes stay under `src/frontend` (Vite + React)
- [x] Backend changes stay under `src/backend` (Python + FastAPI)
- [x] Automated tests for this feature live under repository-root `tests/`
- [x] Screen share includes audio capture when the browser/platform allows;
      degraded modes are user-visible (no silent audio omission)
- [x] LiveKit API secrets remain server-side (read from environment variables); clients receive short-lived tokens only
- [x] Join/leave/publish/subscribe/error paths have structured logging
- [x] Any extra service/proxy/abstraction is justified in Complexity Tracking (none introduced — no extra services beyond frontend + backend + LiveKit)

## Project Structure

### Documentation (this feature)

```text
specs/001-screenshare-platform/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── backend-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── frontend/                  # Vite + React (LiveKit client, capture UI)
│   ├── src/
│   │   ├── components/        # JoinForm, SessionRoom, MediaTile, ControlsBar, StatusBanner
│   │   ├── pages/              # SessionPage (route: /session/:sessionId)
│   │   ├── hooks/              # useLiveKitRoom, useScreenShare, useCameraMic
│   │   └── services/           # api client (fetches token from backend)
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── backend/                   # Python + FastAPI (token minting, single-presenter lock)
    ├── app/
    │   ├── main.py             # FastAPI app, CORS, logging setup
    │   ├── config.py           # Reads LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET from env
    │   ├── api/
    │   │   └── sessions.py     # POST /sessions/{id}/token, GET /sessions/{id}/presenter
    │   ├── services/
    │   │   └── livekit_tokens.py  # Access-token issuance via livekit-api
    │   └── models/
    │       └── schemas.py      # Pydantic request/response models
    ├── requirements.txt
    └── .venv/                  # Local virtual environment (not committed)

tests/
├── contract/                  # Backend API contract tests (token/presenter endpoints)
├── integration/                # Frontend+backend join/share/leave flow tests
└── unit/                       # Backend service unit tests, frontend hook/component tests
```

**Structure Decision**: Confirmed `src/frontend` + `src/backend` + root `tests/` per constitution, no deviation. Backend Python dependencies are isolated in a `.venv` virtual environment at `src/backend/.venv` (gitignored), activated for all backend dev/test/run commands.

## Complexity Tracking

> No Constitution Check violations. This section is not applicable — no extra services, proxies, or abstractions beyond `src/frontend`, `src/backend`, and LiveKit itself are introduced.
