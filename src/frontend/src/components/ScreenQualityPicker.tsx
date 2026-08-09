import {
  DEFAULT_SCREEN_QUALITY_ID,
  SCREEN_QUALITY_OPTIONS,
  isDesktopViewport,
  type ScreenQualityOption,
} from '../lib/screenQuality';

export type ScreenQualityPickerProps = {
  value: ScreenQualityOption['id'];
  onChange: (id: ScreenQualityOption['id']) => void;
  /** When false, hide (e.g. mobile or no active remote screen). */
  visible?: boolean;
};

/**
 * Desktop-only control for subscribed screen-share resolution
 * (maps to LiveKit VideoQuality Low / Medium / High).
 */
export function ScreenQualityPicker({
  value,
  onChange,
  visible = true,
}: ScreenQualityPickerProps) {
  if (!visible || !isDesktopViewport()) return null;

  return (
    <label className="screen-quality-picker">
      <span className="screen-quality-label">Quality</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ScreenQualityOption['id'])}
        aria-label="Screen share quality"
      >
        {SCREEN_QUALITY_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
            {opt.id === DEFAULT_SCREEN_QUALITY_ID ? ' (default)' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
