export type ControlsBarProps = {
  isSharing: boolean;
  cameraEnabled: boolean;
  micEnabled: boolean;
  onToggleShare: () => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onLeave: () => void;
  disabled?: boolean;
};

export function ControlsBar({
  isSharing,
  cameraEnabled,
  micEnabled,
  onToggleShare,
  onToggleCamera,
  onToggleMic,
  onLeave,
  disabled,
}: ControlsBarProps) {
  return (
    <div className="controls-bar">
      <button type="button" onClick={onToggleShare} disabled={disabled} aria-pressed={isSharing}>
        {isSharing ? 'Stop sharing' : 'Share screen'}
      </button>
      <button
        type="button"
        onClick={onToggleCamera}
        disabled={disabled}
        aria-pressed={cameraEnabled}
      >
        {cameraEnabled ? 'Camera off' : 'Camera on'}
      </button>
      <button type="button" onClick={onToggleMic} disabled={disabled} aria-pressed={micEnabled}>
        {micEnabled ? 'Mic off' : 'Mic on'}
      </button>
      <button type="button" className="leave" onClick={onLeave} disabled={disabled}>
        Leave session
      </button>
    </div>
  );
}
