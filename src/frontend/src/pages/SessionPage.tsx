import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConnectionState, Track, type RemoteParticipant } from 'livekit-client';
import { JoinForm } from '../components/JoinForm';
import { MediaTile } from '../components/MediaTile';
import { StatusBanner } from '../components/StatusBanner';
import { ControlsBar } from '../components/ControlsBar';
import { ParticipantSlab } from '../components/ParticipantSlab';
import { ScreenQualityPicker } from '../components/ScreenQualityPicker';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { useScreenShare } from '../hooks/useScreenShare';
import { useCameraMic } from '../hooks/useCameraMic';
import { ApiError, fetchToken, getPresenter, leaveSession } from '../services/api';
import {
  DEFAULT_SCREEN_QUALITY_ID,
  SCREEN_QUALITY_OPTIONS,
  type ScreenQualityOption,
} from '../lib/screenQuality';

type SessionCreds = {
  token: string;
  livekitUrl: string;
  identity: string;
  sessionId: string;
  displayName: string;
};

export function SessionPage() {
  const { sessionId: routeSessionId } = useParams();
  const [creds, setCreds] = useState<SessionCreds | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [presenterLabel, setPresenterLabel] = useState<string | null>(null);
  const [sharingEndedNotice, setSharingEndedNotice] = useState(false);
  const [audioTipDismissed, setAudioTipDismissed] = useState(false);
  const [screenQualityId, setScreenQualityId] =
    useState<ScreenQualityOption['id']>(DEFAULT_SCREEN_QUALITY_ID);
  const stageRef = useRef<HTMLElement>(null);

  const { room, connectionState, error: roomError, remoteMedia, connect, disconnect } =
    useLiveKitRoom();

  const screenShare = useScreenShare(room, creds?.sessionId ?? null, creds?.token ?? null);
  const cameraMic = useCameraMic(room);

  const micByIdentity = useMemo(() => {
    const map = new Map<string, boolean>();
    if (creds) {
      map.set(creds.identity, cameraMic.micEnabled);
    }
    for (const m of remoteMedia) {
      if (m.source === Track.Source.Microphone) {
        map.set(m.participantIdentity, !m.publication.isMuted);
      }
    }
    return map;
  }, [remoteMedia, creds, cameraMic.micEnabled]);

  const screenTiles = remoteMedia.filter((m) => m.source === Track.Source.ScreenShare);
  const localScreenTrack = room?.localParticipant.getTrackPublication(Track.Source.ScreenShare)
    ?.track;

  const cameraByIdentity = useMemo(() => {
    const map = new Map<string, (typeof remoteMedia)[number]>();
    for (const m of remoteMedia) {
      if (m.source === Track.Source.Camera) {
        map.set(m.participantIdentity, m);
      }
    }
    return map;
  }, [remoteMedia]);

  const screenAudio = remoteMedia.filter((m) => m.source === Track.Source.ScreenShareAudio);
  const micAudio = remoteMedia.filter(
    (m) => m.source === Track.Source.Microphone && m.kind === Track.Kind.Audio,
  );

  const hasScreenShare = screenTiles.length > 0 || screenShare.isSharing;

  const remoteParticipants = useMemo(() => {
    if (!room) return [] as RemoteParticipant[];
    return Array.from(room.remoteParticipants.values());
  }, [room, remoteMedia]);

  const screenPubKey = screenTiles.map((t) => t.track.sid).join('|');

  // Apply preferred screen-share layer (default 720p / MEDIUM).
  useEffect(() => {
    const option = SCREEN_QUALITY_OPTIONS.find((o) => o.id === screenQualityId);
    if (!option) return;
    for (const tile of screenTiles) {
      tile.publication.setVideoQuality(option.quality);
    }
    // screenTiles identity covered by screenPubKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenQualityId, screenPubKey]);

  async function handleJoin(sessionId: string, displayName: string) {
    setJoining(true);
    setJoinError(null);
    setSharingEndedNotice(false);
    try {
      const tokenRes = await fetchToken(sessionId, displayName);
      setCreds({
        token: tokenRes.token,
        livekitUrl: tokenRes.livekitUrl,
        identity: tokenRes.identity,
        sessionId: tokenRes.sessionId,
        displayName,
      });
      await connect(tokenRes.token, tokenRes.livekitUrl, tokenRes.sessionId);
      try {
        const presenter = await getPresenter(sessionId);
        setPresenterLabel(presenter.presenterDisplayName ?? null);
      } catch {
        setPresenterLabel(null);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not join session';
      setJoinError(message);
      setCreds(null);
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (creds) {
      try {
        await leaveSession(creds.sessionId, creds.token);
      } catch {
        /* best-effort */
      }
    }
    if (screenShare.isSharing) await screenShare.stop();
    await disconnect();
    setCreds(null);
    setPresenterLabel(null);
  }

  async function handleRetryJoin() {
    if (!creds) return;
    setJoinError(null);
    try {
      await connect(creds.token, creds.livekitUrl, creds.sessionId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Reconnect failed');
    }
  }

  async function toggleStageFullscreen() {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* browser may deny fullscreen */
    }
  }

  const connected = connectionState === ConnectionState.Connected && !!creds;

  const bannerMessage =
    screenShare.permissionError ||
    cameraMic.permissionError ||
    (screenShare.blockedByPresenter
      ? `Blocked — ${screenShare.blockedByPresenter} is sharing`
      : null) ||
    (screenShare.audioUnavailable && screenShare.isSharing
      ? 'Screen audio unavailable for this share source'
      : null) ||
    roomError ||
    (sharingEndedNotice ? 'Screen sharing ended' : null) ||
    (presenterLabel && !screenShare.isSharing && !hasScreenShare
      ? `${presenterLabel} is presenting`
      : null);

  const bannerVariant =
    screenShare.permissionError || cameraMic.permissionError || roomError
      ? 'error'
      : screenShare.blockedByPresenter || screenShare.audioUnavailable
        ? 'warning'
        : 'info';

  const retryAction =
    screenShare.permissionError
      ? screenShare.start
      : cameraMic.permissionError
        ? cameraMic.enableCamera
        : roomError
          ? handleRetryJoin
          : undefined;

  return (
    <div className={`session-page${hasScreenShare && connected ? ' session-page--sharing' : ''}`}>
      <header>
        <h1>Screenshare</h1>
        {creds && (
          <p className="session-meta">
            Session {creds.sessionId} · {creds.displayName}
            {screenShare.isSharing && <span className="sharing-badge"> · Sharing</span>}
          </p>
        )}
      </header>

      {!connected ? (
        <JoinForm
          initialSessionId={routeSessionId ?? ''}
          onJoin={handleJoin}
          busy={joining}
          error={joinError}
        />
      ) : (
        <>
          <StatusBanner
            message={bannerMessage}
            variant={bannerVariant}
            actionLabel={retryAction ? 'Retry' : undefined}
            onAction={retryAction}
          />

          {screenShare.sharingWithAudio && !audioTipDismissed && (
            <StatusBanner
              message="Tip: use headphones to prevent audio echo when sharing screen audio."
              variant="info"
              actionLabel="Dismiss"
              onAction={() => setAudioTipDismissed(true)}
            />
          )}

          <section
            ref={stageRef}
            className={`stage${hasScreenShare ? ' stage--sharing' : ' stage--idle'}`}
          >
            {hasScreenShare ? (
              <div className="stage-screen">
                <div className="stage-screen-toolbar">
                  <ScreenQualityPicker
                    value={screenQualityId}
                    onChange={setScreenQualityId}
                    visible={screenTiles.length > 0}
                  />
                  <button
                    type="button"
                    className="fullscreen-btn"
                    onClick={() => void toggleStageFullscreen()}
                  >
                    Full screen
                  </button>
                </div>
                {screenTiles.map((m) => (
                  <MediaTile
                    key={`${m.participantIdentity}-${m.source}-${m.track.sid}`}
                    track={m.track}
                    displayName={m.displayName}
                    identity={m.participantIdentity}
                    source={m.source}
                  />
                ))}
                {screenTiles.length === 0 && localScreenTrack && creds && (
                  <MediaTile
                    key={`local-screen-${localScreenTrack.sid}`}
                    track={localScreenTrack}
                    displayName={creds.displayName}
                    identity={creds.identity}
                    source={Track.Source.ScreenShare}
                  />
                )}
                {screenTiles.length === 0 && screenShare.isSharing && !localScreenTrack && (
                  <p className="empty-media">Sharing your screen… others will see it here.</p>
                )}
              </div>
            ) : (
              <div className="stage-idle-copy">
                <p className="empty-media">
                  No screen share yet. Share your screen or wait for others.
                </p>
              </div>
            )}

            <aside className="stage-rail" aria-label="Participants">
              {creds && (
                <ParticipantSlab
                  displayName={creds.displayName}
                  identity={creds.identity}
                  localStream={cameraMic.localCameraStream}
                  micOn={cameraMic.micEnabled}
                  isSelf
                />
              )}
              {remoteParticipants.map((p) => {
                const cam = cameraByIdentity.get(p.identity);
                return (
                  <ParticipantSlab
                    key={p.identity}
                    displayName={p.name || p.identity}
                    identity={p.identity}
                    cameraTrack={cam?.track ?? null}
                    micOn={micByIdentity.get(p.identity)}
                  />
                );
              })}
            </aside>
          </section>

          {/* Keep remote audio attached even when not shown as tiles */}
          {screenAudio.map((m) => (
            <MediaTile
              key={`${m.participantIdentity}-screen-audio-${m.track.sid}`}
              track={m.track}
              displayName={m.displayName}
              identity={m.participantIdentity}
              source={m.source}
            />
          ))}
          {micAudio.map((m) => (
            <MediaTile
              key={`${m.participantIdentity}-mic-${m.track.sid}`}
              track={m.track}
              displayName={m.displayName}
              identity={m.participantIdentity}
              source={m.source}
              micOn={micByIdentity.get(m.participantIdentity)}
            />
          ))}

          <ControlsBar
            isSharing={screenShare.isSharing}
            cameraEnabled={cameraMic.cameraEnabled}
            micEnabled={cameraMic.micEnabled}
            onToggleShare={() => {
              if (screenShare.isSharing) {
                void screenShare.stop().then(() => setSharingEndedNotice(true));
              } else {
                setSharingEndedNotice(false);
                setAudioTipDismissed(false);
                void screenShare.start();
              }
            }}
            onToggleCamera={() => {
              if (cameraMic.cameraEnabled) void cameraMic.disableCamera();
              else void cameraMic.enableCamera();
            }}
            onToggleMic={() => {
              if (cameraMic.micEnabled) void cameraMic.disableMic();
              else void cameraMic.enableMic();
            }}
            onLeave={() => void handleLeave()}
          />
        </>
      )}
    </div>
  );
}
