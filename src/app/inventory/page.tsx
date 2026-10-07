import type { Metadata } from "next";
import { Boxes, CircleAlert } from "lucide-react";
import { inventory } from "@/lib/crafts";
import { formatQty } from "@/lib/crafts";
import { ProgressBar } from "@/components/progress";

export const metadata: Metadata = {
  title: "Запасы",
  description:
    "Что уже есть в мастерской: материалы, инструменты и остатки по каждому наименованию.",
};

export default function InventoryPage() {
  const empty = inventory.filter((i) => i.stock === 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Мои запасы
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {inventory.length} наименований на складе мастерской
        </p>
      </header>

      {empty.length > 0 && (
        <div
          role="note"
          className="flex items-start gap-3 rounded-2xl bg-blush-soft p-4 ring-1 ring-blush/30"
        >
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9C5570]" />
          <p className="text-sm text-[#7A4258]">
            <span className="font-semibold">Закончилось:</span>{" "}
            {empty.map((i) => i.name).join(", ")}. Загляните в список покупок
            мастер-класса перед началом работы.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {inventory.map((item) => {
          const level = Math.min(1, item.stock / (item.unit === "мл" || item.unit === "м" ? 500 : 5));
          const tone =
            item.stock === 0
              ? "bg-blush-soft text-[#9C5570]"
              : level < 0.34
                ? "bg-sand-soft text-[#8A6A2F]"
                : "bg-sage-soft text-[#55693F]";
          return (
            <li
              key={item.name}
              className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold leading-snug">
                  {item.name}
                </h2>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}
                >
                  {formatQty(item.stock)} {item.unit}
                </span>
              </div>
              <ProgressBar
                className="mt-3"
                value={item.stock}
                max={item.unit === "мл" || item.unit === "м" ? 500 : 5}
                label="Остаток"
              />
            </li>
          );
        })}
      </ul>

      <p className="flex items-center gap-2 text-xs text-ink-soft">
        <Boxes className="h-4 w-4" />
        Запасы — демо-данные: сравнение с потребностями мастер-классов идёт
        автоматически.
      </p>
    </div>
  );
}
