import { useEffect, useRef } from 'react';

type Props = {
  stream: MediaStream | null;
  displayName: string;
};

/**
 * Fixed bottom-right PiP showing the local camera feed.
 * Muted so the user doesn't hear themselves.
 */
export function SelfCameraPreview({ stream, displayName }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) void el.play().catch(() => {});
  }, [stream]);

  if (!stream) return null;

  return (
    <div className="self-preview">
      <video ref={videoRef} autoPlay playsInline muted />
      <span className="self-preview-label">{displayName}</span>
    </div>
  );
}
