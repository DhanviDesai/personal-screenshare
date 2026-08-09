# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript (Vite + React frontend); Python 3.x (FastAPI backend)

**Primary Dependencies**: LiveKit (media); Vite, React (frontend); FastAPI (backend)

**Storage**: [if applicable, e.g., none for token-only MVP, or NEEDS CLARIFICATION]

**Testing**: [e.g., pytest + frontend test runner under repository-root `tests/`]

**Target Platform**: Modern browsers (WebRTC) + LiveKit-compatible server environment

**Project Type**: Web application (`src/frontend` + `src/backend`)

**Performance Goals**: [domain-specific, e.g., interactive latency for A/V, or NEEDS CLARIFICATION]

**Constraints**: LiveKit-only media plane; secrets server-side; screen-share audio when allowed

**Scale/Scope**: [domain-specific, e.g., concurrent rooms/participants, or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Per `.specify/memory/constitution.md` (LiveKit Screenshare Constitution v1.0.0):

- [ ] Realtime screen/video/audio uses LiveKit only (no alternate media plane)
- [ ] Frontend changes stay under `src/frontend` (Vite + React)
- [ ] Backend changes stay under `src/backend` (Python + FastAPI)
- [ ] Automated tests for this feature live under repository-root `tests/`
- [ ] Screen share includes audio capture when the browser/platform allows;
      degraded modes are user-visible (no silent audio omission)
- [ ] LiveKit API secrets remain server-side; clients receive short-lived tokens only
- [ ] Join/leave/publish/subscribe/error paths have structured logging
- [ ] Any extra service/proxy/abstraction is justified in Complexity Tracking

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Expand the tree below with feature-specific paths.
  Constitution mandates src/frontend, src/backend, and tests/ at repo root.
  Do not switch to alternate layouts without Complexity Tracking justification.
-->

```text
src/
├── frontend/            # Vite + React (LiveKit client, capture UI)
│   ├── components/
│   ├── pages/
│   └── services/
└── backend/             # Python + FastAPI (tokens, room helpers)
    ├── api/
    ├── services/
    └── models/

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: [Confirm `src/frontend` + `src/backend` + root `tests/`,
or document an approved deviation with Constitution Check justification]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
