---

description: "Task list template for feature implementation"
---

# Tasks: Screenshare Media Platform

**Input**: Design documents from `/specs/001-screenshare-platform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-api.md, quickstart.md

**Tests**: Included. The project constitution (III. Test Location and Coverage) MUST-requires automated coverage for token flows, room join, and publish/subscribe behavior, so contract/integration tests for those paths are mandatory, not optional. All tests live under repository-root `tests/`.

**Organization**: Tasks are grouped by user story (from `spec.md`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are exact, matching `plan.md`'s Project Structure

## Path Conventions

- Frontend: `src/frontend/src/...` (Vite + React + TypeScript)
- Backend: `src/backend/app/...` (Python + FastAPI, run inside `src/backend/.venv`)
- Tests: `tests/contract/`, `tests/integration/`, `tests/unit/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per `plan.md`: `src/frontend/`, `src/backend/app/{api,services,models}`, `tests/{contract,integration,unit}`
- [X] T002 Initialize backend Python project in `src/backend/`: create `.venv`, add `requirements.txt` (`fastapi`, `uvicorn`, `livekit-api`, `pydantic-settings`, `pytest`, `httpx`), install deps
- [X] T003 [P] Initialize frontend Vite + React + TypeScript project in `src/frontend/` (`npm create vite@latest`), add `livekit-client` dependency
- [X] T004 [P] Configure backend lint/format tooling (`ruff`, `black`) via `src/backend/pyproject.toml`
- [X] T005 [P] Configure frontend lint/format tooling (ESLint + Prettier) via `src/frontend/.eslintrc` and `src/frontend/.prettierrc`
- [X] T006 [P] Configure test runners: `pytest.ini` (or `pyproject.toml` section) at repo root pointing at `tests/`, and `vitest.config.ts` in `src/frontend/` with test root mapped to `tests/unit`

**Checkpoint**: Both projects scaffold and boot (empty FastAPI app, empty Vite app) before Foundational work begins.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement `src/backend/app/config.py`: read `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` from environment variables via `pydantic-settings`, fail fast with a clear error if any are missing
- [X] T008 Implement structured logging setup in `src/backend/app/main.py` (JSON or key-value structured logs for `session.join`, `session.leave`, `screenshare.lock_granted`, `screenshare.lock_denied`, and generic `error` events per constitution V / FR-013)
- [X] T009 [P] Implement Pydantic request/response schemas in `src/backend/app/models/schemas.py`: `TokenRequest`, `TokenResponse`, `ScreenShareLockRequest`, `ScreenShareLockResponse`, `PresenterResponse`, `ErrorResponse` (per `contracts/backend-api.md`)
- [X] T010 [P] Implement `src/backend/app/services/livekit_tokens.py`: mint short-lived LiveKit access tokens scoped to one `sessionId` + generated `identity` using `livekit-api`'s `AccessToken`, and a `verify_session_token(sessionId, authorization_header) -> identity` helper that validates the bearer token's signature against `LIVEKIT_API_SECRET` and confirms its room claim matches `sessionId` (used by session-scoped endpoints instead of trusting a client-supplied identity — see `contracts/backend-api.md` "Authentication for session-scoped calls")
- [X] T011 [P] Implement `src/backend/app/services/presenter_lock.py`: in-memory per-`sessionId` presenter-lock state (`activePresenterIdentity`, `activePresenterDisplayName`) with `try_acquire`, `release`, and `current` operations (per `data-model.md` Session entity)
- [X] T012 Wire `src/backend/app/main.py`: FastAPI app instance, CORS middleware for the frontend origin, router registration, and `GET /api/healthz` endpoint (depends on T007)
- [X] T013 [P] Implement `src/frontend/src/services/api.ts`: typed client for `POST /api/sessions/{sessionId}/token`, `POST /screen-share/start`, `POST /screen-share/stop`, `GET /presenter`
- [X] T014 [P] Implement `src/frontend/src/hooks/useLiveKitRoom.ts`: wraps `livekit-client` `Room` — connect(token, url), disconnect(), exposes participants/tracks and connection-state/error events
- [X] T015 [P] Implement app shell routing in `src/frontend/src/main.tsx` and `src/frontend/src/pages/SessionPage.tsx` (route `/session/:sessionId`, empty state)

**Checkpoint**: Foundation ready — token issuance, presenter-lock state, LiveKit connect/disconnect, and app shell exist; user story implementation can now begin.

---

## Phase 3: User Story 1 - Join a session and share screen with audio (Priority: P1) 🎯 MVP

**Goal**: A presenter can join a session by ID + display name and share their screen (with audio when the browser allows it); remote viewers see/hear it, with a clear status when audio is unavailable.

**Independent Test**: Two browsers join the same session; one shares screen (with audio when the browser allows); the other sees video and hears shared audio or a clear "audio unavailable" status.

### Tests for User Story 1

- [X] T016 [P] [US1] Contract test for `POST /api/sessions/{sessionId}/token` (success + validation-error cases) in `tests/contract/test_token_endpoint.py`
- [X] T017 [P] [US1] Contract test for `POST /api/sessions/{sessionId}/screen-share/start` and `/stop` (grant, 409 conflict, release) in `tests/contract/test_screen_share_endpoints.py`
- [X] T018 [P] [US1] Integration test: join → start screen share with audio → remote viewer receives video+audio in `tests/integration/test_join_and_share.py`

### Implementation for User Story 1

- [X] T019 [US1] Implement `POST /api/sessions/{sessionId}/token` endpoint in `src/backend/app/api/sessions.py` (depends on T009, T010)
- [X] T020 [US1] Implement `POST /api/sessions/{sessionId}/screen-share/start` and `POST /screen-share/stop` endpoints in `src/backend/app/api/sessions.py`, authenticating the caller via `verify_session_token` (Authorization bearer token) rather than a request-body `identity` field (depends on T009, T010, T011)
- [X] T021 [US1] Implement `GET /api/sessions/{sessionId}/presenter` endpoint in `src/backend/app/api/sessions.py` (depends on T011)
- [X] T022 [P] [US1] Implement `JoinForm` component (session ID + display name inputs, empty/invalid validation per edge cases) in `src/frontend/src/components/JoinForm.tsx`
- [X] T023 [US1] Implement `useScreenShare` hook in `src/frontend/src/hooks/useScreenShare.ts`: `getDisplayMedia({video, audio})`, calls `screen-share/start`/`stop`, publishes/unpublishes tracks via the LiveKit room, exposes `audioUnavailable` and `blockedByPresenter` state (depends on T013, T014)
- [X] T024 [US1] Implement `MediaTile` component to render a remote screen-share video (+ audio) track in `src/frontend/src/components/MediaTile.tsx`
- [X] T025 [US1] Implement `StatusBanner` component for "audio unavailable" and "blocked — <presenter> is sharing" messages in `src/frontend/src/components/StatusBanner.tsx`
- [X] T026 [US1] Wire `SessionPage` (`src/frontend/src/pages/SessionPage.tsx`): `JoinForm` → fetch token via `api.ts` → `useLiveKitRoom.connect` → render own controls + remote `MediaTile`s (depends on T022, T023, T024, T025)
- [X] T027 [US1] Add structured logging calls for `session.join`, `screenshare.lock_granted`, `screenshare.lock_denied` in `src/backend/app/api/sessions.py` (depends on T008, T019, T020)
- [X] T028 [US1] Handle screen-share stop/track-ended events so remote viewers' `MediaTile` disappears promptly and `SessionPage` reflects "sharing ended" (frontend, `useLiveKitRoom.ts` + `SessionPage.tsx`)

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Camera and microphone as first-class media (Priority: P1)

**Goal**: Participants can enable/disable camera and microphone independently of screen share, without ending the session.

**Independent Test**: In a two-participant session, toggle camera and mic on/off for one user and confirm the other sees/hears updates without restarting the session.

### Tests for User Story 2

- [X] T029 [P] [US2] Integration test: independent camera/mic toggle reflects remotely without disrupting active screen share, in `tests/integration/test_camera_mic_toggle.py`

### Implementation for User Story 2

- [X] T030 [US2] Implement `useCameraMic` hook in `src/frontend/src/hooks/useCameraMic.ts`: `getUserMedia`, independent enable/disable for camera and microphone tracks via the LiveKit room (depends on T014)
- [X] T031 [P] [US2] Implement `ControlsBar` component (screen-share / camera / mic toggle buttons with on/off state) in `src/frontend/src/components/ControlsBar.tsx`
- [X] T032 [US2] Wire `ControlsBar` + `useCameraMic` into `SessionPage`, verifying camera/mic toggles do not interrupt an active screen share (`src/frontend/src/pages/SessionPage.tsx`, depends on T026, T030, T031)
- [X] T033 [US2] Extend `MediaTile` to render camera video and indicate mic-on/off state distinctly from screen-share tiles (`src/frontend/src/components/MediaTile.tsx`, depends on T024)

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - View others' media in a session (Priority: P2)

**Goal**: A viewer joining an existing session sees ongoing screen share, camera, and audio from other participants without requiring anyone to restart, and can tell participants apart by display name.

**Independent Test**: Join as a second participant after a presenter is already publishing; confirm all active media appear without the viewer publishing.

### Tests for User Story 3

- [X] T034 [P] [US3] Integration test: participant joining mid-share immediately sees the ongoing screen share within 10s, in `tests/integration/test_late_viewer.py`

### Implementation for User Story 3

- [X] T035 [US3] On `SessionPage` join, call `GET /api/sessions/{sessionId}/presenter` and subscribe to the in-progress presenter's tracks without requiring the presenter to restart (`src/frontend/src/pages/SessionPage.tsx`, depends on T021, T026)
- [X] T036 [US3] Render participant display names alongside each `MediaTile`, keyed by LiveKit `identity` so duplicate display names don't collide (`src/frontend/src/components/MediaTile.tsx`, depends on T024)
- [X] T037 [US3] Handle publisher leave/disconnect events: remove that publisher's tiles for remaining viewers while the viewer's own session stays connected (`src/frontend/src/hooks/useLiveKitRoom.ts`)

**Checkpoint**: User Stories 1, 2, and 3 are all independently functional.

---

## Phase 6: User Story 4 - Leave session and recover from denial or failure (Priority: P3)

**Goal**: Users can leave cleanly, and get clear, actionable feedback (with a retry path) on permission denial or connection failure.

**Independent Test**: Deny screen/mic permission, attempt share, confirm error messaging; leave session and confirm remote peer no longer sees the user.

### Tests for User Story 4

- [X] T038 [P] [US4] Integration test: permission denial surfaces an actionable error and a successful retry after granting permission, in `tests/integration/test_permission_denial.py`
- [X] T039 [P] [US4] Integration test: explicit leave removes the participant's presence and media for remaining participants, in `tests/integration/test_leave_session.py`

### Implementation for User Story 4

- [X] T040 [US4] Implement explicit "Leave session" action: disconnect the LiveKit room and return to the join screen (`src/frontend/src/pages/SessionPage.tsx`, depends on T014, T026)
- [X] T041 [US4] Implement `POST /api/sessions/{sessionId}/leave` beacon endpoint in `src/backend/app/api/sessions.py` per `contracts/backend-api.md`: authenticate via `verify_session_token`, log `session.leave`, and auto-release the presenter lock (`lockReleased: true`) if the leaving participant held it (depends on T008, T010, T011, T020)
- [X] T042 [US4] Call the leave beacon from the frontend on explicit leave and on LiveKit disconnect, attaching the stored LiveKit token as the `Authorization: Bearer` header (`src/frontend/src/hooks/useLiveKitRoom.ts`, `src/frontend/src/services/api.ts`, depends on T013, T041)
- [X] T043 [US4] Implement permission-denial handling in `useScreenShare` and `useCameraMic`: catch `getDisplayMedia`/`getUserMedia` rejections, surface an actionable message via `StatusBanner`, and expose a retry action (`src/frontend/src/hooks/useScreenShare.ts`, `src/frontend/src/hooks/useCameraMic.ts`, `src/frontend/src/components/StatusBanner.tsx`, depends on T023, T025, T030)
- [X] T044 [US4] Implement rejoin/republish retry for transient join or media failures without a full page reload (`src/frontend/src/pages/SessionPage.tsx`, depends on T026)

**Checkpoint**: All four user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T045 [P] Unit tests for `livekit_tokens` and `presenter_lock` services in `tests/unit/test_livekit_tokens.py` and `tests/unit/test_presenter_lock.py`
- [X] T046 [P] Unit tests for `useLiveKitRoom`, `useScreenShare`, `useCameraMic` hooks in `tests/unit/frontend/`
- [X] T047 Add 400-level request validation (empty/invalid `sessionId`/`displayName`) consistently across all endpoints in `src/backend/app/api/sessions.py` per `contracts/backend-api.md`
- [X] T048 [P] Add backend `README.md` covering `.venv` setup and required `LIVEKIT_*` environment variables (per `quickstart.md`) in `src/backend/README.md`
- [X] T049 [P] Security pass: confirm `LIVEKIT_API_SECRET` is never logged or included in any API response body, across `src/backend/app/`
- [X] T050 Run all `quickstart.md` validation scenarios end-to-end manually (or via `tests/integration/`) across all four user stories and the single-presenter-lock and capacity checks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — no dependency on other stories (MVP)
- **User Story 2 (Phase 4)**: Depends on Foundational; integrates with US1's `SessionPage`/`MediaTile` but is independently testable
- **User Story 3 (Phase 5)**: Depends on Foundational; integrates with US1's presenter/`SessionPage` wiring but is independently testable
- **User Story 4 (Phase 6)**: Depends on Foundational; integrates with US1's `SessionPage` and hooks but is independently testable
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — this is the MVP slice
- **US2 (P1)**: No functional dependency on US1's screen-share behavior, but shares `SessionPage`/`ControlsBar` wiring introduced in US1
- **US3 (P2)**: Builds on US1's presenter/lock endpoints to show "who is presenting" to a late joiner
- **US4 (P3)**: Builds on US1/US2's publish hooks to add denial/retry/leave handling

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend endpoints depend on the foundational services (T009–T011)
- Frontend hooks depend on `useLiveKitRoom` (T014) and `api.ts` (T013)
- `SessionPage` wiring (T026) is the integration point later stories extend

### Parallel Opportunities

- Setup tasks T003–T006 can run in parallel with T002 (different files/toolchains)
- Foundational tasks T009–T011 and T013–T015 can run in parallel (distinct files, no cross-dependency)
- Tests within a story (e.g., T016–T018) can run in parallel
- Across stories, once Foundational is done, US1–US4 backend/frontend tasks that touch different files can be staffed in parallel, though `SessionPage.tsx` edits (T026, T032, T035, T040, T044) should be sequenced to avoid conflicting edits to the same file

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task: "Contract test for POST /api/sessions/{sessionId}/token in tests/contract/test_token_endpoint.py"
Task: "Contract test for screen-share start/stop in tests/contract/test_screen_share_endpoints.py"
Task: "Integration test join+share-with-audio in tests/integration/test_join_and_share.py"

# Launch independent implementation pieces together:
Task: "Implement JoinForm component in src/frontend/src/components/JoinForm.tsx"
Task: "Implement MediaTile component in src/frontend/src/components/MediaTile.tsx"
Task: "Implement StatusBanner component in src/frontend/src/components/StatusBanner.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md scenario 1 (join + share with audio) independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate → MVP demo
3. Add User Story 2 → validate independently → demo
4. Add User Story 3 → validate independently → demo
5. Add User Story 4 → validate independently → demo
6. Polish phase → final quickstart.md full pass

### Parallel Team Strategy

With multiple developers, after Foundational completes:

- Developer A: User Story 1 (MVP, backend-heavy: token + lock endpoints)
- Developer B: User Story 2 (frontend-heavy: camera/mic hook + controls)
- Developer C: User Story 3 + 4 (viewer sync, leave/retry handling)

Coordinate on shared files (`SessionPage.tsx`, `MediaTile.tsx`) to avoid conflicting edits.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Presenter-lock enforcement is server-side (`presenter_lock.py`) per FR-003a — do not rely on client-only enforcement
- Session-scoped calls (`screen-share/start`, `/stop`, `/leave`) authenticate via the caller's LiveKit bearer token (`verify_session_token` in `livekit_tokens.py`), never via a client-supplied `identity` field — see `contracts/backend-api.md` "Authentication for session-scoped calls"
- LiveKit credentials are read from environment variables only (`config.py`); never log or return `LIVEKIT_API_SECRET`
- Backend commands run inside `src/backend/.venv`
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
