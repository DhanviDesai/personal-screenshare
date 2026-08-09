<!--
Sync Impact Report
- Version change: (none / template) → 1.0.0
- Modified principles: N/A (initial ratification from placeholders)
  - [PRINCIPLE_1_NAME] → I. LiveKit-First Media Path
  - [PRINCIPLE_2_NAME] → II. Separated Frontend and Backend
  - [PRINCIPLE_3_NAME] → III. Test Location and Coverage
  - [PRINCIPLE_4_NAME] → IV. Media Completeness
  - [PRINCIPLE_5_NAME] → V. Simplicity and Observability
- Added sections: Technology Stack & Layout; Development Workflow; Governance (filled)
- Removed sections: None (placeholders replaced)
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check gates + source layout)
  - ✅ .specify/templates/tasks-template.md (path conventions for this repo)
  - ✅ .specify/templates/spec-template.md (streaming/media assumption guidance)
  - ⚠ .specify/templates/commands/*.md (directory not present; skipped)
  - ⚠ README.md / docs/quickstart.md (not present yet; deferred)
- Follow-up TODOs: Add root README and quickstart when project scaffolding lands.
-->

# LiveKit Screenshare Constitution

## Core Principles

### I. LiveKit-First Media Path

All realtime screen, video, and audio streaming MUST use LiveKit as the
media platform. Application code MUST NOT invent alternate peer-to-peer or
custom RTP paths for core media. Token issuance, room join/leave, and
track publish/subscribe MUST go through LiveKit APIs and SDKs.

**Rationale**: One media plane keeps latency, quality, and operational
behavior predictable and avoids fragmented transport stacks.

### II. Separated Frontend and Backend

The web client MUST live under `src/frontend` (Vite + React). Server-side
API and orchestration MUST live under `src/backend` (Python + FastAPI).
Frontend MUST own browser capture (screen/camera/mic) and LiveKit client
sessions. Backend MUST own privileged concerns (token minting, room
lifecycle helpers, server configuration) and MUST NOT embed UI.

**Rationale**: Clear ownership reduces coupling and keeps secrets and
token logic off the client.

### III. Test Location and Coverage

All automated tests MUST live under the repository-root `tests/` tree
(unit, integration, and contract as applicable). Features that change
token flows, room join, or publish/subscribe behavior MUST include
automated coverage for those paths. Streaming regressions that only
surface end-to-end SHOULD be covered by integration tests when the
feature specifies them.

**Rationale**: A single test root keeps discovery consistent and makes
media-path regressions easier to catch before merge.

### IV. Media Completeness

Screen sharing MUST support capturing system or tab audio together with
video when the browser and platform allow it. Video and microphone audio
paths MUST remain first-class and independently toggleable. Degraded
modes (for example, screen video without audio due to browser limits)
MUST surface clear user-visible status; silent failure is not allowed.

**Rationale**: Incomplete share sessions are a primary user failure mode
for collaboration and streaming products.

### V. Simplicity and Observability

Prefer the simplest design that meets the feature. Extra services,
proxies, or abstractions require documented justification in the plan
Complexity Tracking table. Client and server MUST emit structured logs
for join, leave, publish, subscribe, and error paths sufficient to
diagnose failed sessions without attaching a debugger.

**Rationale**: Realtime systems fail in subtle ways; lean design plus
actionable logs shortens recovery time.

## Technology Stack & Layout

- **Media platform**: LiveKit (rooms, participants, tracks).
- **Frontend**: Vite + React in `src/frontend`.
- **Backend**: Python + FastAPI in `src/backend`.
- **Tests**: Repository-root `tests/` (not nested exclusively under
  frontend or backend packages unless a package-local harness is also
  mirrored or invoked from `tests/`).
- **Secrets**: LiveKit API keys and other credentials MUST remain
  server-side; the client receives only short-lived tokens.

Plans and tasks MUST use these paths. Alternate layouts require a
Constitution Check violation entry with justification.

## Development Workflow

1. Specify the feature (`/speckit-specify`), clarify as needed, then plan
   (`/speckit-plan`) with a passing Constitution Check before Phase 0
   research completes.
2. Derive tasks (`/speckit-tasks`) using `src/frontend`, `src/backend`,
   and `tests/` paths.
3. Implement in MVP slices ordered by user-story priority; validate each
   story independently where feasible.
4. Pull requests MUST confirm: stack/layout compliance, LiveKit-only
   media path, media-completeness behavior for screen share, and tests
   under `tests/` for changed critical paths.

## Governance

This constitution supersedes conflicting informal practice. Amendments
MUST update `.specify/memory/constitution.md`, bump
`CONSTITUTION_VERSION` using semantic versioning (MAJOR for incompatible
principle removals/redefinitions, MINOR for new principles or materially
expanded guidance, PATCH for clarifications), set **Last Amended** to the
amendment date, and propagate changes to dependent templates and agent
guidance.

Compliance review: every `/speckit-plan` Constitution Check and every PR
touching streaming, tokens, or project layout MUST verify these
principles. Unjustified complexity or stack drift MUST be blocked or
explicitly waived in Complexity Tracking.

Runtime development guidance lives in feature `quickstart.md` files under
`specs/` and in `docs/` when present.

**Version**: 1.0.0 | **Ratified**: 2026-08-09 | **Last Amended**: 2026-08-09
