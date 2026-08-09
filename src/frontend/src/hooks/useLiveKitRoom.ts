import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type TrackPublication,
} from 'livekit-client';
import { leaveSessionBeacon } from '@/services/api';

export type RemoteMedia = {
  participantIdentity: string;
  displayName: string;
  track: RemoteTrack;
  publication: RemoteTrackPublication;
  source: Track.Source;
  kind: Track.Kind;
};

export type UseLiveKitRoomResult = {
  room: Room | null;
  connectionState: ConnectionState;
  error: string | null;
  remoteMedia: RemoteMedia[];
  connect: (token: string, url: string, sessionId: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

function collectRemoteMedia(room: Room): RemoteMedia[] {
  const items: RemoteMedia[] = [];
  room.remoteParticipants.forEach((participant: RemoteParticipant) => {
    participant.trackPublications.forEach((publication: RemoteTrackPublication) => {
      if (!publication.track || !publication.isSubscribed) return;
      items.push({
        participantIdentity: participant.identity,
        displayName: participant.name || participant.identity,
        track: publication.track,
        publication,
        source: publication.source,
        kind: publication.kind,
      });
    });
  });
  return items;
}

export function useLiveKitRoom(): UseLiveKitRoomResult {
  const roomRef = useRef<Room | null>(null);
  const sessionRef = useRef<{ sessionId: string; token: string } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.Disconnected,
  );
  const [error, setError] = useState<string | null>(null);
  const [remoteMedia, setRemoteMedia] = useState<RemoteMedia[]>([]);

  const refreshMedia = useCallback(() => {
    const r = roomRef.current;
    if (!r) {
      setRemoteMedia([]);
      return;
    }
    setRemoteMedia(collectRemoteMedia(r));
  }, []);

  const attachListeners = useCallback(
    (r: Room) => {
      const onState = (state: ConnectionState) => {
        setConnectionState(state);
        if (state === ConnectionState.Disconnected) {
          const ctx = sessionRef.current;
          if (ctx) {
            leaveSessionBeacon(ctx.sessionId, ctx.token);
          }
        }
      };
      const onTrackSubscribed = (
        _track: RemoteTrack,
        _pub: RemoteTrackPublication,
        _participant: RemoteParticipant,
      ) => refreshMedia();
      const onTrackUnsubscribed = () => refreshMedia();
      const onParticipantDisconnected = () => refreshMedia();
      const onTrackMuted = (_pub: TrackPublication) => refreshMedia();
      const onTrackUnmuted = (_pub: TrackPublication) => refreshMedia();
      const onDisconnected = () => {
        setConnectionState(ConnectionState.Disconnected);
        refreshMedia();
      };

      r.on(RoomEvent.ConnectionStateChanged, onState);
      r.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
      r.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
      r.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      r.on(RoomEvent.TrackMuted, onTrackMuted);
      r.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
      r.on(RoomEvent.Disconnected, onDisconnected);
    },
    [refreshMedia],
  );

  const connect = useCallback(
    async (token: string, url: string, sessionId: string) => {
      setError(null);
      if (roomRef.current) {
        await roomRef.current.disconnect();
        roomRef.current = null;
      }
      const r = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = r;
      setRoom(r);
      attachListeners(r);
      sessionRef.current = { sessionId, token };
      try {
        await r.connect(url, token);
        setConnectionState(r.state);
        refreshMedia();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect to session';
        setError(message);
        setConnectionState(ConnectionState.Disconnected);
        throw err;
      }
    },
    [attachListeners, refreshMedia],
  );

  const disconnect = useCallback(async () => {
    const ctx = sessionRef.current;
    const r = roomRef.current;
    if (ctx) {
      leaveSessionBeacon(ctx.sessionId, ctx.token);
    }
    if (r) {
      await r.disconnect();
    }
    roomRef.current = null;
    sessionRef.current = null;
    setRoom(null);
    setRemoteMedia([]);
    setConnectionState(ConnectionState.Disconnected);
  }, []);

  useEffect(() => {
    return () => {
      void roomRef.current?.disconnect();
    };
  }, []);

  return { room, connectionState, error, remoteMedia, connect, disconnect };
}
