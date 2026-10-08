"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/toast";
import { crafts, formatQty } from "@/lib/crafts";
import { addShoppingItems } from "@/lib/shopping-list";
import { cn } from "@/lib/utils";
import type { StockItem } from "@/data/mockData";

/* Ёмкость склада по единице измерения — от неё считается остаток для светофора. */
const MAX_BY_UNIT: Record<string, number> = {
  мл: 500,
  м: 100,
  г: 500,
  кг: 5,
  л: 2,
  шт: 5,
};

type Tone = "red" | "amber" | "green";

function percentOf(item: StockItem): number {
  const max = MAX_BY_UNIT[item.unit] ?? 5;
  return Math.min(100, Math.round((item.stock / max) * 100));
}

/* Светофор остатка: <20% — мало, <50% — средне, дальше — много.
   В дефолтном виде — только кружок и слово, без цифр и процентов. */
function toneOf(percent: number): Tone {
  if (percent < 20) return "red";
  if (percent < 50) return "amber";
  return "green";
}

const TONE_DOT: Record<Tone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  green: "bg-sage",
};

const TONE_LABEL: Record<Tone, string> = {
  red: "Мало",
  amber: "Средне",
  green: "Много",
};

const TONE_CHIP: Record<Tone, string> = {
  red: "bg-red-50 text-red-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-sage-soft text-[#55693F]",
};

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* Максимум, сколько материала уходит на один мастер-класс, — по нему
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
    return `хватит на ~${projects} ${pluralRu(projects, "проект", "проекта", "проектов")}`;
  }
  return "в запасе мастерской";
}

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const SWATCH_BASE = ["#F2D9CC", "#E4EBDC", "#F5E9D2", "#F4DFE6", "#DDE8F0"];
const SWATCH_ACCENT = ["#C77B58", "#9CAF88", "#DDB771", "#C98DA4", "#8FAEC7"];

/* Фото материала: детерминированная композиция из хеша названия
   (реальных фото в данных нет, свотч держит стиль и различает позиции). */
function MaterialSwatch({ name, className }: { name: string; className?: string }) {
  const seed = hashName(name);
  const accent = SWATCH_ACCENT[seed % SWATCH_ACCENT.length];
  const base = SWATCH_BASE[seed % SWATCH_BASE.length];
  let s = seed;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const shapes = Array.from({ length: 5 }, () => {
    const x = 30 + rand() * 340;
    const y = 25 + rand() * 210;
    const r = 18 + rand() * 52;
    const tone = rand() < 0.6 ? accent : "#FFFFFF";
    const opacity = 0.14 + rand() * 0.26;
    if (rand() < 0.55) {
      return (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill={tone}
          opacity={opacity}
        />
      );
    }
    return (
      <rect
        key={`${x}-${y}`}
        x={x - r}
        y={y - r / 2.4}
        width={r * 2}
        height={r / 1.2}
        rx={r / 3}
        fill={tone}
        opacity={opacity}
        transform={`rotate(${Math.round(rand() * 60 - 30)} ${x} ${y})`}
      />
    );
  });
  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Материал: ${name}`}
      className={className}
    >
      <rect width="400" height="260" fill={base} />
      {shapes}
    </svg>
  );
}

type FilterId = "all" | Tone;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "red", label: "🟥 Мало" },
  { id: "amber", label: "🟨 Средне" },
  { id: "green", label: "🟩 Много" },
];

function updatedLabel(days: number): string {
  if (days <= 0) return "только что";
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн. назад`;
  return `${Math.floor(days / 7)} нед. назад`;
}

export function InventoryClient({ items }: { items: StockItem[] }) {
  const showToast = useToast();
  const [filter, setFilter] = useState<FilterId>("all");
  const [openName, setOpenName] = useState<string | null>(null);
  const [list, setList] = useState(items);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [busyName, setBusyName] = useState<string | null>(null);
  const usage = useMemo(usageByName, []);

  const visible = list.filter((item) => {
    if (filter === "all") return true;
    return toneOf(percentOf(item)) === filter;
  });

  const addToShoppingList = () => {
    const low = list.filter((item) => percentOf(item) < 20);
    if (low.length === 0) {
      showToast("Докупать нечего", "Все запасы выше минимального порога");
      return;
    }
    const { added } = addShoppingItems(
      low.map((item) => {
        const need = usage.get(item.name) ?? 0;
        return {
          name: item.name,
          qty: need > 0 ? need : null,
          unit: item.unit,
          source: "Низкий остаток в запасах",
        };
      })
    );
    showToast(
      added > 0
        ? `В списке покупок: +${added} ${pluralRu(added, "позиция", "позиции", "позиций")}`
        : "Эти позиции уже в списке",
      "Кнопка «Покупки» — в шапке сверху"
    );
  };

  /* Списание одним тапом: вычитаем расход на один проект через существующий
     POST /api/inventory (upsert остатка) и обновляем карточку оптимистично. */
  const writeOff = async (item: StockItem) => {
    if (item.stock <= 0) {
      showToast("Позиция пуста", `«${item.name}» — сначала докупить`);
      return;
    }
    const need = usage.get(item.name) ?? 0;
    const amount = need > 0 ? Math.min(need, item.stock) : item.stock;
    const nextStock = Math.round((item.stock - amount) * 1000) / 1000;
    setBusyName(item.name);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          stock: nextStock,
          unit: item.unit,
        }),
      });
      if (!res.ok) throw new Error(`inventory POST ${res.status}`);
      setList((prev) =>
        prev.map((i) => (i.name === item.name ? { ...i, stock: nextStock } : i))
      );
      setFresh((prev) => new Set(prev).add(item.name));
      showToast(
        `Списано: ${formatQty(amount)} ${item.unit}`,
        `${item.name} — расход на один проект`
      );
    } catch {
      showToast("Не получилось списать", "Проверьте связь и попробуйте ещё раз");
    } finally {
      setBusyName(null);
    }
  };

  const buyOne = (item: StockItem) => {
    const need = usage.get(item.name) ?? 0;
    const { added } = addShoppingItems([
      {
        name: item.name,
        qty: need > 0 ? need : null,
        unit: item.unit,
        source: "Запасы: пора докупить",
      },
    ]);
    showToast(
      added > 0 ? "Добавлено в список покупок" : "Уже в списке покупок",
      added > 0 ? item.name : `«${item.name}» уже ждёт в списке`
    );
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
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => {
            const tone = toneOf(percentOf(item));
            const need = usage.get(item.name) ?? 0;
            const open = openName === item.name;
            const days = 1 + (hashName(item.name) % 9);
            return (
              <li key={item.name}>
                <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
                  <button
                    type="button"
                    onClick={() => setOpenName(open ? null : item.name)}
                    aria-expanded={open}
                    aria-label={`${item.name}: ${TONE_LABEL[tone]}. ${open ? "Свернуть" : "Развернуть"}`}
                    className="block w-full text-left"
                  >
                    <div className="relative">
                      <MaterialSwatch
                        name={item.name}
                        className="aspect-[16/9] w-full"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink shadow-sm">
                        {item.stock === 0
                          ? "Пусто"
                          : `${formatQty(item.stock)} ${item.unit}`}
                      </span>
                    </div>
                    <div className="p-2.5 pb-2">
                      <h2 className="line-clamp-1 text-sm font-bold leading-snug">
                        {item.name}
                      </h2>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            TONE_CHIP[tone]
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              TONE_DOT[tone]
                            )}
                          />
                          {TONE_LABEL[tone]}
                        </span>
                        <ChevronDown
                          aria-hidden
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform",
                            open && "rotate-180"
                          )}
                        />
                      </div>
                    </div>
                  </button>
                  <div
                    className={cn(
                      "grid overflow-hidden transition-all duration-200",
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="min-h-0 border-t border-dashed border-ink/10 px-2.5 py-2.5">
                      <p className="text-[13px] font-semibold">
                        {item.stock === 0
                          ? "Пусто — пора докупить"
                          : `${formatQty(item.stock)} ${item.unit} — ${contextOf(item.stock, item.unit, need)}`}
                      </p>
                      <p className="mt-1 text-[11px] text-ink-soft">
                        {need > 0
                          ? `Использовано: ${formatQty(need)} ${item.unit} на 1 проект`
                          : "Не нужно для мастер-классов"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        Обновлено:{" "}
                        {fresh.has(item.name) ? "только что" : updatedLabel(days)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => writeOff(item)}
                          disabled={busyName === item.name}
                          className="min-h-9 rounded-xl bg-white px-3 text-[11px] font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98] disabled:opacity-50"
                        >
                          {busyName === item.name ? "Списываем…" : "Списать"}
                        </button>
                        <button
                          type="button"
                          onClick={() => buyOne(item)}
                          className="min-h-9 rounded-xl bg-clay px-3 text-[11px] font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
                        >
                          Докупить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={addToShoppingList}
        aria-label="Добавить низкие остатки в список покупок"
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
