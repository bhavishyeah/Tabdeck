interface Props {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  return (
    <div className="td-empty-state">
      <div className="td-empty-icon">✦</div>
      <h2 className="td-empty-title">{title}</h2>
      <p className="td-empty-description">{description}</p>

      {actionLabel && onAction && (
        <button className="td-empty-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}