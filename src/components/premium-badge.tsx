import { Crown } from "lucide-react";

/* Бейдж «Premium» с подсказкой. Ставится на закрытые возможности:
   расширенная статистика, экспорт .csv, доски сверх лимита.
   Элементы с бейджем не прячем, а показываем в заблокированном виде. */

export function PremiumBadge({
  tooltip = "Доступно на тарифе Премиум",
}: {
  tooltip?: string;
}) {
  return (
    <span className="group relative inline-flex cursor-help" title={tooltip}>
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#DDB771] to-[#C98DA4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
        <Crown className="h-3 w-3" aria-hidden />
        Premium
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-center text-xs font-medium leading-snug text-paper opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {tooltip}
      </span>
    </span>
  );
}
