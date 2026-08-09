import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('livekit-client', () => {
  class FakeRoom {
    state = 'disconnected';
    remoteParticipants = new Map();
    localParticipant = {
      getTrackPublications: () => [],
      getTrackPublication: () => null,
      publishTrack: vi.fn(),
      unpublishTrack: vi.fn(),
    };
    on = vi.fn();
    connect = vi.fn(async () => {
      this.state = 'connected';
    });
    disconnect = vi.fn(async () => {
      this.state = 'disconnected';
    });
  }
  return {
    Room: FakeRoom,
    RoomEvent: {
      ConnectionStateChanged: 'ConnectionStateChanged',
      TrackSubscribed: 'TrackSubscribed',
      TrackUnsubscribed: 'TrackUnsubscribed',
      ParticipantDisconnected: 'ParticipantDisconnected',
      TrackMuted: 'TrackMuted',
      TrackUnmuted: 'TrackUnmuted',
      Disconnected: 'Disconnected',
    },
    ConnectionState: {
      Disconnected: 'disconnected',
      Connected: 'connected',
    },
    Track: { Source: {}, Kind: {} },
  };
});

vi.mock('@/services/api', () => ({
  leaveSessionBeacon: vi.fn(),
}));

import { useLiveKitRoom } from '@/hooks/useLiveKitRoom';

describe('useLiveKitRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects with token and url', async () => {
    const { result } = renderHook(() => useLiveKitRoom());
    await act(async () => {
      await result.current.connect('tok', 'wss://example', 'sess');
    });
    expect(result.current.room).not.toBeNull();
    expect(result.current.connectionState).toBe('connected');
  });
});
