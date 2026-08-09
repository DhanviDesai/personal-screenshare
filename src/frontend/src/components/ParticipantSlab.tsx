import { useEffect, useRef } from 'react';
import type { RemoteTrack } from 'livekit-client';

export type ParticipantSlabProps = {
  displayName: string;
  identity: string;
  /** Remote or local camera track when present. */
  cameraTrack?: RemoteTrack | null;
  /** Local preview stream (takes precedence over cameraTrack for self). */
  localStream?: MediaStream | null;
  micOn?: boolean;
  isSelf?: boolean;
};

function initialFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Compact rail tile: live camera when on, otherwise a slab with the
 * display-name initial.
 */
export function ParticipantSlab({
  displayName,
  identity,
  cameraTrack,
  localStream,
  micOn,
  isSelf,
}: ParticipantSlabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = Boolean(localStream || cameraTrack);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (localStream) {
      el.srcObject = localStream;
      void el.play().catch(() => {});
      return () => {
        el.srcObject = null;
      };
    }

    if (cameraTrack) {
      cameraTrack.attach(el);
      return () => {
        cameraTrack.detach(el);
      };
    }

    el.srcObject = null;
    return undefined;
  }, [localStream, cameraTrack]);

  return (
    <div
      className={`participant-slab${hasVideo ? ' has-video' : ' avatar-only'}${isSelf ? ' self' : ''}`}
      data-identity={identity}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={Boolean(isSelf || localStream)}
          className={isSelf || localStream ? 'mirrored' : undefined}
        />
      ) : (
        <div className="participant-avatar" aria-hidden>
          {initialFor(displayName)}
        </div>
      )}
      <div className="participant-slab-meta">
        <span className="tile-label">
          {displayName}
          {isSelf ? ' (you)' : ''}
        </span>
        <span className="mic-indicator">{micOn === false ? 'Mic off' : 'Mic on'}</span>
      </div>
    </div>
  );
}
