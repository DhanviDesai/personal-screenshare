import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  startScreenShare: vi.fn(async () => ({
    granted: false,
    error: 'presenter_lock_held',
    presenterIdentity: 'x',
    presenterDisplayName: 'Grace',
  })),
  stopScreenShare: vi.fn(),
}));

import { useScreenShare } from '@/hooks/useScreenShare';

describe('useScreenShare', () => {
  it('surfaces blockedByPresenter when lock denied', async () => {
    const room = { localParticipant: { publishTrack: vi.fn(), getTrackPublications: () => [] } };
    const { result } = renderHook(() => useScreenShare(room as never, 'sess', 'token'));
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.blockedByPresenter).toBe('Grace');
    expect(result.current.isSharing).toBe(false);
  });
});
