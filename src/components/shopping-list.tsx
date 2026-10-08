"use client";

import { Download, CheckCircle2, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/toast";
import { addShoppingItems } from "@/lib/shopping-list";
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
    const text = exportListText(craft);
    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${craft.slug}-spisok-pokupok.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("Файл .txt сохранён", text);
    } catch {
      showToast("Список покупок", text);
    }
  };

  const handleAddAll = () => {
    const { added } = addShoppingItems(
      missing.map(({ material, missing: qty }) => ({
        name: material.name,
        qty,
        unit: material.unit,
        price: material.price,
        source: craft.title,
      }))
    );
    showToast(
      added > 0 ? `В списке покупок: +${added} поз.` : "Эти позиции уже в списке",
      "Кнопка «Покупки» — в шапке сверху"
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddAll}
            disabled={missing.length === 0}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-clay-soft hover:text-[#8A4A2C] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" />
            В общий список
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" />
            Экспорт в .txt
          </button>
        </div>
      </div>
    </section>
  );
}
