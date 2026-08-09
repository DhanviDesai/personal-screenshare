# Phase 0 Research: Screenshare Media Platform

**Feature**: `001-screenshare-platform` | **Date**: 2026-08-09

All Technical Context items were resolvable from the spec, constitution, and explicit user directives (no unresolved `NEEDS CLARIFICATION` markers remain).

## Decision: Backend framework and structure

- **Decision**: FastAPI app under `src/backend/app`, run with `uvicorn`, dependencies isolated in a local `.venv` virtual environment.
- **Rationale**: Constitution mandates Python + FastAPI under `src/backend`. `.venv` is the standard, dependency-free way to isolate Python deps per-project without extra tooling (poetry/pipenv), keeping the stack simple (constitution V: Simplicity). Explicit user directive confirmed `.venv` usage.
- **Alternatives considered**: Poetry/PDM (rejected — adds a dependency manager layer not needed for a small token-minting service); Django (rejected — far heavier than needed for a token-issuance + thin API service).

## Decision: LiveKit credential handling

- **Decision**: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` are read from process environment variables at backend startup (via a `config.py` using `os.environ` / `pydantic-settings`), validated eagerly (fail fast if missing), and never exposed in any API response.
- **Rationale**: Constitution mandates secrets remain server-side; explicit user directive says "read the keys from environment." This is also the standard LiveKit deployment pattern (server SDK examples use env vars).
- **Alternatives considered**: Hardcoded config file (rejected — secrets in source control, violates constitution); secrets manager integration (rejected as unnecessary complexity for this feature's scope; can be layered later without API changes since it's still "read from environment/config at startup").

## Decision: Token issuance flow

- **Decision**: Frontend calls `POST /sessions/{sessionId}/token` with `{displayName}`; backend mints a short-lived LiveKit access token (via `livekit-api`'s `AccessToken`) granting join/publish/subscribe grants scoped to that room, and returns `{token, livekitUrl}`. Frontend uses this to connect via `livekit-client`.
- **Rationale**: Matches constitution II (backend owns token minting, frontend owns LiveKit client session) and FR-012 (server-issued short-lived credentials only).
- **Alternatives considered**: Client-side token generation using a shared secret (rejected — would require shipping the API secret to the browser, directly violating constitution and FR-012).

## Decision: Single-presenter lock enforcement

- **Decision**: Enforced server-side. Backend tracks "current presenter" per session (in-memory, keyed by session ID) via a lightweight state store; a `POST /sessions/{sessionId}/screen-share/start` call is required before a client is granted permission to publish a screen-share track (token's video-publish grant for the screen-share source is only elevated for the accepted presenter), and `POST /sessions/{sessionId}/screen-share/stop` releases the lock. If a second participant attempts to start while locked, the backend returns 409 with the current presenter's display name.
- **Identity verification**: `screen-share/start`/`stop` (and `leave`) authenticate the caller via the `Authorization: Bearer <livekit-token>` header rather than a client-supplied `identity` field — the backend verifies the token's signature against `LIVEKIT_API_SECRET` and reads `identity` from its `sub` claim. This closes the spoofing gap a body-supplied identity would otherwise leave open (any participant could otherwise claim to be another and release/hijack the lock), reusing the same secret already loaded for token minting rather than adding a second auth scheme.
- **Rationale**: FR-003a requires the lock to be enforced by "the system," not just client UI convention — a client-only lock could be bypassed by a modified client. Server-side state also keeps this simple (no DB) since sessions are ephemeral (in-memory dict is sufficient at this scale, per SC-007's ~4-participant target).
- **Alternatives considered**: Client-side-only lock via LiveKit room metadata negotiated between clients (rejected — race-prone with no arbitration and easy to bypass, weaker guarantee for FR-003a); LiveKit webhooks + external state store (rejected — unnecessary infrastructure for an in-memory, single-process-scale feature; would violate constitution V simplicity without justified need); trusting a client-supplied `identity` field (rejected — trivially spoofable, discovered during `/speckit-analyze` review).

## Decision: Testing approach

- **Decision**: Backend: `pytest` with `TestClient` (FastAPI) for contract tests on token/session endpoints, unit tests for token-minting and lock-state services, all under `tests/contract` and `tests/unit`. Frontend: Vitest + React Testing Library for component/hook unit tests under `tests/unit`; a small number of integration tests (e.g., Playwright) under `tests/integration` for the join → share → view flow, run against a locally started frontend+backend+LiveKit dev stack.
- **Rationale**: Matches constitution III (single `tests/` root) and covers the token/room-join paths the constitution calls out as mandatory coverage.
- **Alternatives considered**: Nested test directories under each package only (rejected — constitution requires repository-root `tests/`).

## Decision: Frontend media/session state management

- **Decision**: Local React state + custom hooks (`useLiveKitRoom`, `useScreenShare`, `useCameraMic`) wrapping the `livekit-client` `Room` object; no global state library needed at this scope.
- **Rationale**: Constitution V favors simplicity; a single-room, single-page experience with ~4 participants doesn't need Redux/Zustand-level state management.
- **Alternatives considered**: Redux/Zustand (rejected as unnecessary complexity for this scope; can be revisited if scope grows).

## Open items

None. All Technical Context fields are resolved.
