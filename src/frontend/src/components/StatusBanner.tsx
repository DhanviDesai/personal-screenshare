export type StatusBannerProps = {
  message: string | null;
  variant?: 'info' | 'warning' | 'error';
  actionLabel?: string;
  onAction?: () => void;
};

export function StatusBanner({
  message,
  variant = 'info',
  actionLabel,
  onAction,
}: StatusBannerProps) {
  if (!message) return null;
  return (
    <div className={`status-banner ${variant}`} role="status">
      <span>{message}</span>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
