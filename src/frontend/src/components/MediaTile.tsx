import { useEffect, useRef } from 'react';
import { Track, type RemoteTrack } from 'livekit-client';

export type MediaTileProps = {
  track: RemoteTrack;
  displayName: string;
  identity: string;
  source: Track.Source;
  micOn?: boolean;
};

export function MediaTile({ track, displayName, identity, source, micOn }: MediaTileProps) {
  const elRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const isScreen = source === Track.Source.ScreenShare || source === Track.Source.ScreenShareAudio;
  const isAudioOnly = track.kind === Track.Kind.Audio;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  if (isAudioOnly && source === Track.Source.ScreenShareAudio) {
    return <audio ref={elRef as React.RefObject<HTMLAudioElement>} autoPlay />;
  }

  if (isAudioOnly) {
    return (
      <div className="media-tile audio-only" data-identity={identity}>
        <span className="tile-label">{displayName}</span>
        <span className="mic-indicator">{micOn === false ? 'Mic off' : 'Mic on'}</span>
        <audio ref={elRef as React.RefObject<HTMLAudioElement>} autoPlay />
      </div>
    );
  }

  return (
    <div
      className={`media-tile ${isScreen ? 'screen' : 'camera'}`}
      data-identity={identity}
      data-source={source}
    >
      <video ref={elRef as React.RefObject<HTMLVideoElement>} autoPlay playsInline muted={false} />
      <div className="tile-meta">
        <span className="tile-label">{displayName}</span>
        <span className="tile-kind">{isScreen ? 'Screen' : 'Camera'}</span>
        {!isScreen && (
          <span className="mic-indicator">{micOn === false ? 'Mic off' : 'Mic on'}</span>
        )}
      </div>
    </div>
  );
}
