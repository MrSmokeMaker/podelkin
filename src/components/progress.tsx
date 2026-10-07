export function ProgressBar({
  value,
  max,
  label,
  className = "",
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={className}>
      {label && (
        <div className="mb-2 flex justify-between text-xs font-semibold text-ink-soft">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 overflow-hidden rounded-full bg-ink/10"
      >
        <div
          className="h-full rounded-full bg-clay transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
