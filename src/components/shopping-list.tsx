"use client";

import { Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/toast";
import {
  exportListText,
  formatRub,
  missingItems,
  missingTotal,
  type Craft,
} from "@/lib/crafts";

export function ShoppingList({ craft }: { craft: Craft }) {
  const showToast = useToast();
  const missing = missingItems(craft);
  const total = missingTotal(craft);

  const handleExport = () => {
    showToast(
      "Список покупок готов",
      exportListText(craft)
    );
  };

  return (
    <section
      aria-label="Список покупок"
      className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Список покупок</h2>
        <span className="rounded-full bg-clay-soft px-3 py-1 text-xs font-semibold text-[#8A4A2C]">
          Не хватает: {missing.length} из {craft.materials.length}
        </span>
      </div>

      {missing.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-sage-soft p-4 text-sm font-medium text-[#55693F]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          Всё необходимое уже есть в запасах — можно начинать!
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/5">
          {missing.map(({ material, missing: qty, cost }) => (
            <li
              key={material.name}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="font-medium">{material.name}</span>
              <span className="shrink-0 text-right">
                <span className="font-semibold text-[#8A4A2C]">
                  {qty} {material.unit}
                </span>
                <span className="ml-2 text-ink-soft">{formatRub(cost)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Итого к оплате:{" "}
          <span className="text-base font-bold text-ink">{formatRub(total)}</span>
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
        >
          <Download className="h-4 w-4" />
          Экспорт в .txt
        </button>
      </div>
    </section>
  );
}
