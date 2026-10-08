/* Тон заливки: clay — терракота по умолчанию, red/amber/green — пороги
   остатка на экране запасов (<20% / <50% / >=50%). */
const TONE_CLASS = {
  clay: "bg-clay",
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-sage",
} as const;

export function ProgressBar({
  value,
  max,
  label,
  tone = "clay",
  className = "",
}: {
  value: number;
  max: number;
  label?: string;
  tone?: keyof typeof TONE_CLASS;
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
          className={`h-full rounded-full transition-all duration-500 ${TONE_CLASS[tone]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
