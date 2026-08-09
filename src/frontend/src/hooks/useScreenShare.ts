import { useCallback, useRef, useState } from 'react';
import { LocalAudioTrack, LocalVideoTrack, Room, Track } from 'livekit-client';
import { startScreenShare, stopScreenShare } from '@/services/api';

export type UseScreenShareResult = {
  isSharing: boolean;
  audioUnavailable: boolean;
  /** True once sharing is active and an audio track was captured. */
  sharingWithAudio: boolean;
  blockedByPresenter: string | null;
  permissionError: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearErrors: () => void;
};

type LiveTracks = {
  video: LocalVideoTrack | null;
  audio: LocalAudioTrack | null;
};

export function useScreenShare(
  room: Room | null,
  sessionId: string | null,
  token: string | null,
): UseScreenShareResult {
  const [isSharing, setIsSharing] = useState(false);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [sharingWithAudio, setSharingWithAudio] = useState(false);
  const [blockedByPresenter, setBlockedByPresenter] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Refs so stop() always has the current tracks regardless of re-renders.
  const tracksRef = useRef<LiveTracks>({ video: null, audio: null });
  // Stable ref to the latest stop fn so the native 'ended' listener always calls current stop.
  const stopRef = useRef<() => Promise<void>>(async () => {});

  const clearErrors = useCallback(() => {
    setBlockedByPresenter(null);
    setPermissionError(null);
  }, []);

  const stop = useCallback(async () => {
    const { video, audio } = tracksRef.current;
    if (room) {
      if (video) {
        try { await room.localParticipant.unpublishTrack(video); } catch { /* ignore */ }
        video.stop();
      }
      if (audio) {
        try { await room.localParticipant.unpublishTrack(audio); } catch { /* ignore */ }
        audio.stop();
      }
    }
    tracksRef.current = { video: null, audio: null };
    if (sessionId && token) {
      try { await stopScreenShare(sessionId, token); } catch { /* best-effort */ }
    }
    setIsSharing(false);
    setAudioUnavailable(false);
    setSharingWithAudio(false);
  }, [room, sessionId, token]);

  // Keep ref in sync so 'ended' listeners always call the latest stop.
  stopRef.current = stop;

  const start = useCallback(async () => {
    if (!room || !sessionId || !token) return;
    clearErrors();

    const lock = await startScreenShare(sessionId, token);
    if (!lock.granted) {
      setBlockedByPresenter(lock.presenterDisplayName || 'another participant');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        // Request audio — the browser will offer system/tab audio where supported.
        audio: true,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      setPermissionError(
        name === 'NotAllowedError'
          ? 'Screen share permission was denied. Allow screen capture and try again.'
          : err instanceof Error
            ? err.message
            : 'Could not start screen share',
      );
      try { await stopScreenShare(sessionId, token); } catch { /* ignore */ }
      return;
    }

    const [videoMT] = stream.getVideoTracks();
    const [audioMT] = stream.getAudioTracks();

    if (videoMT) {
      const videoTrack = new LocalVideoTrack(videoMT, undefined, true);
      tracksRef.current.video = videoTrack;
      await room.localParticipant.publishTrack(videoTrack, {
        source: Track.Source.ScreenShare,
      });
      videoMT.addEventListener('ended', () => void stopRef.current());
    }

    if (audioMT) {
      const audioTrack = new LocalAudioTrack(audioMT, undefined, true);
      tracksRef.current.audio = audioTrack;
      await room.localParticipant.publishTrack(audioTrack, {
        source: Track.Source.ScreenShareAudio,
      });
    }

    setAudioUnavailable(!audioMT);
    setSharingWithAudio(!!audioMT);
    setIsSharing(true);
  }, [room, sessionId, token, clearErrors, stop]);

  return {
    isSharing,
    audioUnavailable,
    sharingWithAudio,
    blockedByPresenter,
    permissionError,
    start,
    stop,
    clearErrors,
  };
}
