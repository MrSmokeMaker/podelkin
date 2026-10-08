"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, ShoppingCart } from "lucide-react";
import { ProgressBar } from "@/components/progress";
import { useToast } from "@/components/toast";
import { crafts, formatQty } from "@/lib/crafts";
import { cn } from "@/lib/utils";
import type { StockItem } from "@/data/mockData";

/* Ёмкость склада по единице измерения — от неё считается заполненность шкалы. */
const MAX_BY_UNIT: Record<string, number> = {
  мл: 500,
  м: 100,
  г: 500,
  кг: 5,
  л: 2,
  шт: 5,
};

type Threshold = {
  tone: "red" | "amber" | "green";
  label: string;
  labelClass: string;
};

/* Пороги остатка: <20% — красный, <50% — жёлтый, дальше — зелёный. */
function thresholdOf(percent: number): Threshold {
  if (percent < 20) {
    return { tone: "red", label: "Мало", labelClass: "text-red-700" };
  }
  if (percent < 50) {
    return { tone: "amber", label: "Достаточно", labelClass: "text-amber-700" };
  }
  return { tone: "green", label: "Полный", labelClass: "text-[#55693F]" };
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* Максимум, сколько материала уходит на один мастер-класс — по нему
   считаем, на сколько проектов хватит остатка. */
function usageByName(): Map<string, number> {
  const usage = new Map<string, number>();
  for (const craft of crafts) {
    for (const material of craft.materials) {
      usage.set(material.name, Math.max(usage.get(material.name) ?? 0, material.qty));
    }
  }
  return usage;
}

function contextOf(stock: number, unit: string, need: number): string {
  if (stock === 0) return "нужно докупить";
  if (need > 0) {
    const projects = Math.floor(stock / need);
    if (projects === 0) return "меньше, чем на 1 проект";
    return `~${projects} ${pluralRu(projects, "проект", "проекта", "проектов")}`;
  }
  return "в запасе мастерской";
}

type FilterId = "all" | "low" | "clay" | "fabric" | "findings";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "low", label: "Мало остатка" },
  { id: "clay", label: "Глина" },
  { id: "fabric", label: "Ткань" },
  { id: "findings", label: "Фурнитура" },
];

function groupOf(name: string): FilterId | null {
  const n = name.toLowerCase();
  if (n.includes("глин") || n.includes("глазур") || n.includes("шликер")) {
    return "clay";
  }
  if (
    n.includes("ткан") ||
    n.includes("джинс") ||
    n.includes("синтепон") ||
    n.includes("шнур") ||
    n.includes("пряж") ||
    n.includes("шерст") ||
    n.includes("мулине") ||
    n.includes("нитк")
  ) {
    return "fabric";
  }
  if (
    n.includes("швенз") ||
    n.includes("булав") ||
    n.includes("бусин") ||
    n.includes("глазк") ||
    n.includes("фитил")
  ) {
    return "findings";
  }
  return null;
}

export function InventoryClient({ items }: { items: StockItem[] }) {
  const showToast = useToast();
  const [filter, setFilter] = useState<FilterId>("all");
  const [openName, setOpenName] = useState<string | null>(null);
  const usage = useMemo(usageByName, []);

  const visible = items.filter((item) => {
    const max = MAX_BY_UNIT[item.unit] ?? 5;
    const percent = Math.min(100, Math.round((item.stock / max) * 100));
    if (filter === "low") return percent < 20;
    if (filter === "all") return true;
    return groupOf(item.name) === filter;
  });

  const shoppingText = () => {
    const low = items.filter((item) => {
      const max = MAX_BY_UNIT[item.unit] ?? 5;
      return Math.min(100, Math.round((item.stock / max) * 100)) < 20;
    });
    return [
      "Докупить в мастерской:",
      ...low.map(
        (item) =>
          `• ${item.name} — сейчас ${formatQty(item.stock)} ${item.unit}`
      ),
    ].join("\n");
  };

  const addToShoppingList = async () => {
    const text = shoppingText();
    try {
      await navigator.clipboard.writeText(text);
      showToast("Список покупок готов", "Скопирован в буфер обмена");
    } catch {
      showToast("Список покупок", text);
    }
  };

  return (
    <>
      <div
        role="group"
        aria-label="Фильтр запасов"
        className="flex flex-wrap gap-2"
      >
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors active:scale-95",
              filter === id
                ? "bg-clay text-paper shadow-card"
                : "bg-white text-ink-soft ring-1 ring-ink/10 hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-ink-soft shadow-card ring-1 ring-ink/5">
          Под этот фильтр ничего не нашлось.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => {
            const max = MAX_BY_UNIT[item.unit] ?? 5;
            const percent = Math.min(100, Math.round((item.stock / max) * 100));
            const t = thresholdOf(percent);
            const need = usage.get(item.name) ?? 0;
            const open = openName === item.name;
            const badge =
              item.stock === 0 ? "Нет в наличии" : percent < 20 ? "Мало" : null;
            return (
              <li key={item.name}>
                <button
                  type="button"
                  onClick={() => setOpenName(open ? null : item.name)}
                  aria-expanded={open}
                  title={
                    need > 0
                      ? `Использовано: ${formatQty(need)} ${item.unit} на 1 проект · Добавлено: ~${formatQty(need + item.stock)} ${item.unit}`
                      : "Не используется в мастер-классах"
                  }
                  className={cn(
                    "w-full rounded-xl bg-white p-4 text-left transition-shadow",
                    percent < 20
                      ? "shadow-lg ring-2 ring-red-300"
                      : "shadow-card ring-1 ring-ink/5 hover:shadow-soft"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold leading-snug">
                      {item.name}
                    </h2>
                    {badge && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {formatQty(item.stock)} {item.unit} (
                    {contextOf(item.stock, item.unit, need)})
                  </p>
                  <div className="mt-3 mb-1.5 flex items-center justify-between text-[11px] font-bold">
                    <span className={t.labelClass}>{t.label}</span>
                    <span className="text-ink-soft">{percent}%</span>
                  </div>
                  <ProgressBar value={item.stock} max={max} tone={t.tone} />
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-200",
                      open
                        ? "mt-3 grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <dl className="min-h-0 space-y-1 rounded-lg bg-paper-deep/60 px-3 py-2 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-soft">Использовано:</dt>
                        <dd className="font-semibold">
                          {need > 0
                            ? `${formatQty(need)} ${item.unit} на 1 проект`
                            : "не нужно для мастер-классов"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-ink-soft">Добавлено:</dt>
                        <dd className="font-semibold">
                          ~{formatQty(need + item.stock)} {item.unit}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-ink-soft">
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        open && "rotate-180"
                      )}
                    />
                    {open ? "Скрыть историю" : "История расхода"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={addToShoppingList}
        aria-label="Добавить в список покупок"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-clay text-paper shadow-soft transition hover:bg-[#B06A48] active:scale-95 md:bottom-8 md:right-8"
      >
        <span className="relative">
          <ShoppingCart className="h-6 w-6" aria-hidden />
          <Plus
            aria-hidden
            className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-paper text-clay"
            strokeWidth={3}
          />
        </span>
      </button>
    </>
  );
}
