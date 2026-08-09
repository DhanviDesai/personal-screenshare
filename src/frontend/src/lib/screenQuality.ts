import { VideoQuality } from 'livekit-client';

export type ScreenQualityOption = {
  id: 'low' | '720' | '1080';
  label: string;
  quality: VideoQuality;
};

/** Receiver-side options. Default is 720p (MEDIUM). */
export const SCREEN_QUALITY_OPTIONS: ScreenQualityOption[] = [
  { id: 'low', label: 'Low', quality: VideoQuality.LOW },
  { id: '720', label: '720p', quality: VideoQuality.MEDIUM },
  { id: '1080', label: '1080p', quality: VideoQuality.HIGH },
];

export const DEFAULT_SCREEN_QUALITY_ID: ScreenQualityOption['id'] = '720';

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(min-width: 768px)').matches;
}
