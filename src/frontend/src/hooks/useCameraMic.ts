import { useCallback, useState } from 'react';
import {
  Room,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from 'livekit-client';

export type UseCameraMicResult = {
  cameraEnabled: boolean;
  micEnabled: boolean;
  permissionError: string | null;
  /** Live MediaStream of the local camera preview, or null when camera is off. */
  localCameraStream: MediaStream | null;
  enableCamera: () => Promise<void>;
  disableCamera: () => Promise<void>;
  enableMic: () => Promise<void>;
  disableMic: () => Promise<void>;
  clearErrors: () => void;
};

export function useCameraMic(room: Room | null): UseCameraMicResult {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraTrack, setCameraTrack] = useState<LocalVideoTrack | null>(null);
  const [micTrack, setMicTrack] = useState<LocalAudioTrack | null>(null);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);

  const clearErrors = useCallback(() => setPermissionError(null), []);

  const enableCamera = useCallback(async () => {
    if (!room) return;
    clearErrors();
    try {
      const track = await createLocalVideoTrack();
      await room.localParticipant.publishTrack(track, { source: Track.Source.Camera });
      setCameraTrack(track);
      setLocalCameraStream(new MediaStream([track.mediaStreamTrack]));
      setCameraEnabled(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      setPermissionError(
        name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access and try again.'
          : err instanceof Error
            ? err.message
            : 'Could not enable camera',
      );
    }
  }, [room, clearErrors]);

  const disableCamera = useCallback(async () => {
    if (!room) return;
    if (cameraTrack) {
      await room.localParticipant.unpublishTrack(cameraTrack);
      cameraTrack.stop();
      setCameraTrack(null);
    } else {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (pub?.track) {
        await room.localParticipant.unpublishTrack(pub.track);
        pub.track.stop();
      }
    }
    setLocalCameraStream(null);
    setCameraEnabled(false);
  }, [room, cameraTrack]);

  const enableMic = useCallback(async () => {
    if (!room) return;
    clearErrors();
    try {
      const track = await createLocalAudioTrack();
      await room.localParticipant.publishTrack(track, { source: Track.Source.Microphone });
      setMicTrack(track);
      setMicEnabled(true);
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      setPermissionError(
        name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow microphone access and try again.'
          : err instanceof Error
            ? err.message
            : 'Could not enable microphone',
      );
    }
  }, [room, clearErrors]);

  const disableMic = useCallback(async () => {
    if (!room) return;
    if (micTrack) {
      await room.localParticipant.unpublishTrack(micTrack);
      micTrack.stop();
      setMicTrack(null);
    } else {
      const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (pub?.track) {
        await room.localParticipant.unpublishTrack(pub.track);
        pub.track.stop();
      }
    }
    setMicEnabled(false);
  }, [room, micTrack]);

  return {
    cameraEnabled,
    micEnabled,
    permissionError,
    localCameraStream,
    enableCamera,
    disableCamera,
    enableMic,
    disableMic,
    clearErrors,
  };
}
