import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('livekit-client', () => ({
  Track: { Source: { Camera: 'camera', Microphone: 'microphone' } },
  createLocalVideoTrack: vi.fn(async () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    throw err;
  }),
  createLocalAudioTrack: vi.fn(),
}));

import { useCameraMic } from '@/hooks/useCameraMic';

describe('useCameraMic', () => {
  it('surfaces permission error on camera denial', async () => {
    const room = {
      localParticipant: {
        publishTrack: vi.fn(),
        unpublishTrack: vi.fn(),
        getTrackPublication: () => null,
      },
    };
    const { result } = renderHook(() => useCameraMic(room as never));
    await act(async () => {
      await result.current.enableCamera();
    });
    expect(result.current.permissionError).toMatch(/permission was denied/i);
    expect(result.current.cameraEnabled).toBe(false);
  });
});
