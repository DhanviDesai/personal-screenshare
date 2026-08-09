import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ConnectionState, Track } from 'livekit-client';
import { JoinForm } from '../components/JoinForm';
import { MediaTile } from '../components/MediaTile';
import { StatusBanner } from '../components/StatusBanner';
import { ControlsBar } from '../components/ControlsBar';
import { SelfCameraPreview } from '../components/SelfCameraPreview';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { useScreenShare } from '../hooks/useScreenShare';
import { useCameraMic } from '../hooks/useCameraMic';
import { ApiError, fetchToken, getPresenter, leaveSession } from '../services/api';

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

  const { room, connectionState, error: roomError, remoteMedia, connect, disconnect } =
    useLiveKitRoom();

  const screenShare = useScreenShare(room, creds?.sessionId ?? null, creds?.token ?? null);
  const cameraMic = useCameraMic(room);

  const micByIdentity = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of remoteMedia) {
      if (m.source === Track.Source.Microphone) {
        map.set(m.participantIdentity, !m.publication.isMuted);
      }
    }
    return map;
  }, [remoteMedia]);

  const visibleTiles = remoteMedia.filter(
    (m) =>
      m.source === Track.Source.ScreenShare ||
      m.source === Track.Source.Camera ||
      (m.source === Track.Source.Microphone && m.kind === Track.Kind.Audio),
  );

  const screenAudio = remoteMedia.filter((m) => m.source === Track.Source.ScreenShareAudio);

  const hasScreenShare = visibleTiles.some((m) => m.source === Track.Source.ScreenShare);

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
      try { await leaveSession(creds.sessionId, creds.token); } catch { /* best-effort */ }
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
    <div className="session-page">
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

          <div className={`media-grid${hasScreenShare ? ' has-screen' : ''}`}>
            {visibleTiles.map((m) => (
              <MediaTile
                key={`${m.participantIdentity}-${m.source}-${m.track.sid}`}
                track={m.track}
                displayName={m.displayName}
                identity={m.participantIdentity}
                source={m.source}
                micOn={micByIdentity.get(m.participantIdentity)}
              />
            ))}
            {/* Screen-share audio rendered as invisible <audio> elements */}
            {screenAudio.map((m) => (
              <MediaTile
                key={`${m.participantIdentity}-screen-audio-${m.track.sid}`}
                track={m.track}
                displayName={m.displayName}
                identity={m.participantIdentity}
                source={m.source}
              />
            ))}
            {visibleTiles.length === 0 && (
              <p className="empty-media">
                No remote media yet. Share your screen or wait for others.
              </p>
            )}
          </div>

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

          <SelfCameraPreview
            stream={cameraMic.localCameraStream}
            displayName={creds.displayName}
          />
        </>
      )}
    </div>
  );
}
