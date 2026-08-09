# Feature Specification: Screenshare Media Platform

**Feature Branch**: `001-screenshare-platform`

**Created**: 2026-08-09

**Status**: Draft

**Input**: User description: "LiveKit-based screensharing, video and audio platform. Screen sharing must capture audio too. Vite+React website and Python FastAPI server if needed. Website in src/frontend, FastAPI in src/backend, tests in tests."

## Clarifications

### Session 2026-08-09

- Q: How does a person get into a Session? → A: Open join — anyone with the session identifier and a display name can join; no passcode or host gating.
- Q: Can multiple people screen-share at once in a Session? → A: No — single-presenter lock. Only one screen share can be active at a time; a second user must wait until the current share stops before starting their own.
- Q: How many participants must a single session support? → A: Very small, up to ~4 participants.
- Q: What happens to a session lifecycle when it becomes empty? → A: Ephemeral — a session exists only while occupied; it has no special persisted state, reuse guarantee, or explicit end action when empty.
- Q: Are duplicate display names allowed within the same session? → A: Yes — display names are labels only, no uniqueness is enforced.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join a session and share screen with audio (Priority: P1)

A presenter opens the web app, joins a named session, starts screen sharing, and optionally includes system or tab audio with the shared video. Remote participants in the same session see the shared screen and hear shared audio when available.

**Why this priority**: Screen sharing with audio is the core product promise; without it the platform does not deliver its primary value.

**Independent Test**: Two browsers join the same session; one shares screen (with audio when the browser allows); the other sees video and hears shared audio or a clear “audio unavailable” status.

**Acceptance Scenarios**:

1. **Given** a valid session name and display name, **When** a user joins, **Then** they appear as a participant in the session within a few seconds and can start sharing media.
2. **Given** a joined presenter, **When** they start screen share and allow audio capture, **Then** remote viewers receive screen video and shared audio together.
3. **Given** a joined presenter, **When** they start screen share but the browser or platform cannot provide share audio, **Then** screen video still publishes and viewers see an explicit status that share audio is unavailable (not silent failure).
4. **Given** an active screen share, **When** the presenter stops sharing, **Then** remote viewers stop receiving that screen (and share audio) promptly and the UI reflects that sharing has ended.

---

### User Story 2 - Camera and microphone as first-class media (Priority: P1)

A participant enables camera and/or microphone independently of screen share so others can see and hear them. Each path can be toggled on or off without ending the session.

**Why this priority**: Video and mic are required for a complete realtime collaboration experience alongside screen share; constitution treats them as first-class.

**Independent Test**: In a two-participant session, toggle camera and mic on/off for one user and confirm the other sees/hears updates without restarting the session.

**Acceptance Scenarios**:

1. **Given** a joined participant, **When** they enable the camera, **Then** remote viewers see their camera video.
2. **Given** a joined participant, **When** they enable the microphone, **Then** remote viewers hear their mic audio.
3. **Given** camera and/or mic enabled, **When** the user disables either, **Then** that track stops for remote viewers and local UI shows the off state.
4. **Given** screen share active, **When** the user toggles camera or mic, **Then** screen share continues uninterrupted.

---

### User Story 3 - View others’ media in a session (Priority: P2)

A viewer joins an existing session and watches/listens to presenters’ screen, camera, and audio without necessarily publishing their own media.

**Why this priority**: Consumption completes the loop; a share with no viewers is incomplete, but join-and-publish can ship first as MVP.

**Independent Test**: Join as a second participant after a presenter is already publishing; confirm all active media appear without the viewer publishing.

**Acceptance Scenarios**:

1. **Given** a session with an active screen share, **When** a new participant joins, **Then** they receive the ongoing screen (and share audio if present) without requiring the presenter to restart.
2. **Given** the active presenter plus other participants publishing camera/mic, **When** a viewer is in the session, **Then** they can distinguish whose media they are seeing/hearing (at least by display name).
3. **Given** a publisher leaves or disconnects, **When** the viewer remains, **Then** that publisher’s media disappears and the viewer stays in the session.

---

### User Story 4 - Leave session and recover from denial or failure (Priority: P3)

Users can leave cleanly. If permissions are denied or connection fails, they get clear feedback and a path to retry.

**Why this priority**: Reliability and clarity prevent abandoned sessions; secondary to core publish/subscribe flows.

**Independent Test**: Deny screen/mic permission, attempt share, confirm error messaging; leave session and confirm remote peer no longer sees the user.

**Acceptance Scenarios**:

1. **Given** a joined user, **When** they leave the session, **Then** they disconnect and other participants no longer see them as present.
2. **Given** the user denies capture permission, **When** they attempt to publish that media, **Then** the app explains what failed and how to retry (e.g., allow permission and try again).
3. **Given** a temporary join or media failure, **When** the user retries, **Then** they can rejoin or republish without requiring a full page reload unless the failure is unrecoverable.

---

### Edge Cases

- Screen share audio unavailable (browser, OS, or tab-only capture without audio): video continues; status is visible to presenter and viewers.
- User denies camera, mic, or screen permission: no silent failure; actionable message; other media paths remain usable.
- Presenter refreshes or loses network mid-share: session membership and media for that user clear for others; presenter can rejoin and republish.
- A second user attempts to start screen share while another presenter's share is active: the attempt is blocked with a clear message indicating who is currently presenting; they may try again once the active share stops.
- Empty or invalid session name / display name: join is blocked with a clear validation message.
- Viewer joins before anyone publishes: they wait in an empty session state until media appears.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to join a realtime media session using only a session identifier and a display name (open join; no passcode or host approval required).
- **FR-002**: Users MUST be able to leave a session explicitly; leaving MUST remove their presence and media from other participants’ views.
- **FR-003**: Presenters MUST be able to share their screen as video to other participants in the same session.
- **FR-003a**: The system MUST enforce a single-presenter lock for screen share: only one screen share may be active in a session at a time. If another participant attempts to start a screen share while one is active, the attempt MUST be blocked with a clear message naming the current presenter.
- **FR-004**: Screen sharing MUST include system or tab audio together with screen video when the user’s browser and platform allow it.
- **FR-005**: When screen-share audio cannot be captured, the system MUST still allow screen video and MUST show a clear, user-visible indication that share audio is unavailable.
- **FR-006**: Users MUST be able to publish camera video independently of screen share.
- **FR-007**: Users MUST be able to publish microphone audio independently of screen-share audio.
- **FR-008**: Users MUST be able to toggle screen share, camera, and microphone on and off without leaving the session.
- **FR-009**: Participants MUST be able to receive (view/hear) other participants’ published screen, camera, and audio media in the same session.
- **FR-010**: The system MUST show participant display names alongside their media so viewers can tell sources apart. Display names are not required to be unique within a session; duplicates are permitted and not deduplicated or disambiguated by the system.
- **FR-011**: The system MUST surface user-visible errors for permission denial, join failure, and publish/subscribe failure, with a clear retry path where recovery is possible.
- **FR-012**: Privileged session access credentials MUST be issued by a server-side component; the browser MUST NOT hold long-lived media-platform secrets.
- **FR-013**: Join, leave, publish, subscribe, and error events MUST be observable via structured application logs sufficient to diagnose a failed session without a debugger.

### Key Entities

- **Session**: A named, ephemeral realtime gathering where participants exchange media; identified by a session identifier. It exists only while occupied by at least one participant; no persisted state, scheduling, or explicit end action is guaranteed once empty.
- **Participant**: A person in a session with a display name (not required to be unique within the session) and optional published media.
- **Media stream**: A unit of published content—screen video, screen audio, camera video, or microphone audio—that others can receive.
- **Session access grant**: Short-lived permission that allows a participant to join a specific session (issued server-side).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can join a session and start screen sharing in under 2 minutes without assistance.
- **SC-002**: In a supported desktop browser, when the user grants screen and audio capture, remote viewers receive both screen video and share audio in at least 95% of successful share starts in manual validation.
- **SC-003**: When share audio is unavailable, 100% of observed cases show an explicit “audio unavailable” (or equivalent) status to the presenter within 3 seconds of share start—never a silent missing-audio outcome.
- **SC-004**: Camera and microphone can each be turned on and off independently; remote participants reflect the change within 3 seconds under normal network conditions.
- **SC-005**: A second participant joining an active share sees ongoing media without the presenter restarting, in under 10 seconds after join completes.
- **SC-006**: At least 90% of testers successfully complete join → share screen → remote view on the first attempt in a guided pilot.
- **SC-007**: A session supports at least 4 concurrent participants with all media (screen, camera, mic) remaining responsive and within the latency targets above.

## Assumptions

- Realtime screen, video, and audio transport uses LiveKit as the sole media platform (project constitution).
- Screen-share audio is in scope whenever the browser permits; degraded video-only share is allowed with explicit status (constitution: Media Completeness).
- v1 targets modern desktop browsers commonly used for screen capture with audio (e.g., Chromium-based); mobile capture may be limited or view-only.
- Access model for v1 is confirmed open join by session identifier plus display name (no passcode, no host gating, no full account/identity system); server still mints short-lived access grants per FR-012.
- Screen share is single-presenter-locked (one active share per session at a time); camera and microphone remain independently publishable by multiple participants concurrently.
- Sessions are sized for small groups: v1 must comfortably support up to 4 concurrent participants; larger sessions are out of scope for this feature.
- Sessions are ephemeral: reusing the same session identifier after everyone has left is not guaranteed to behave consistently and is out of scope to design for in v1.
- Recording, transcription, chat, file transfer, and persistent user profiles are out of scope for this feature.
- Project layout follows constitution: web client under `src/frontend`, server under `src/backend`, automated tests under repository-root `tests/`.
- Users have microphone/camera hardware as needed and a network suitable for realtime media.
