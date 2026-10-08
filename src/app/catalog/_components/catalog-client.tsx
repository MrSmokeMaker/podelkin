"use client";

import { useMemo, useState } from "react";
import { CraftCard } from "@/components/craft-card";
import {
  categories,
  categoryColors,
  crafts,
  type Category,
  type Difficulty,
} from "@/lib/crafts";
import { cn } from "@/lib/utils";

const difficulties: Difficulty[] = ["Легко", "Средне", "Сложно"];

export function CatalogClient() {
  const [category, setCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);

  const filtered = useMemo(
    () =>
      crafts.filter(
        (c) =>
          (!category || c.category === category) &&
          (!difficulty || c.difficulty === difficulty) &&
          (maxCost === null || c.materials.reduce((s, m) => s + m.qty * m.price, 0) <= maxCost)
      ),
    [category, difficulty, maxCost]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl">Каталог мастер-классов</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Найдено: {filtered.length} из {crafts.length}
        </p>
      </header>

      {/* Категории: компактный горизонтальный скролл-бар вместо россыпи кнопок.
          Выбор подсвечивается тонкой акцентной рамкой, не заливкой. */}
      <div
        role="group"
        aria-label="Категории"
        className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-1"
      >
        <div className="flex w-max gap-2">
          <CategoryChip active={category === null} onClick={() => setCategory(null)}>
            Все
          </CategoryChip>
          {categories.map((cat) => (
            <CategoryChip
              key={cat}
              active={category === cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              dotColor={categoryColors[cat]}
            >
              {cat}
            </CategoryChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 sm:flex-row sm:items-end sm:gap-8">
        <fieldset className="flex-1">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Сложность: {difficulty ?? "любая"}
          </legend>
          <DifficultySlider value={difficulty} onChange={setDifficulty} />
        </fieldset>

        <fieldset className="sm:w-56">
          <label
            htmlFor="max-cost"
            className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
          >
            Бюджет до {maxCost === null ? "любого" : `${maxCost} ₽`}
          </label>
          <input
            id="max-cost"
            type="range"
            min={100}
            max={3000}
            step={100}
            value={maxCost ?? 3000}
            onChange={(e) => {
              const v = Number(e.target.value);
              setMaxCost(v >= 3000 ? null : v);
            }}
            className="mt-3 w-full accent-clay"
          />
        </fieldset>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink-soft shadow-card ring-1 ring-ink/5">
          Ничего не нашлось — ослабьте фильтры.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((craft, index) => (
            <CraftCard key={craft.slug} craft={craft} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
  dotColor,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-10 shrink-0 items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium transition-transform active:scale-95",
        active
          ? "animate-chip-pulse border-clay text-[#8A4A2C]"
          : "border-ink/10 text-ink-soft hover:border-clay/40 hover:text-ink"
      )}
    >
      {dotColor && (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {children}
    </button>
  );
}

/* Ползунок сложности: 0 — «любая», дальше три ступени. Нативный range —
   доступен с клавиатуры и удобен на тач-экранах. */
function DifficultySlider({
  value,
  onChange,
}: {
  value: Difficulty | null;
  onChange: (value: Difficulty | null) => void;
}) {
  const index = value ? difficulties.indexOf(value) + 1 : 0;
  return (
    <div>
      <input
        id="difficulty"
        type="range"
        min={0}
        max={3}
        step={1}
        value={index}
        aria-label="Сложность"
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(v === 0 ? null : difficulties[v - 1]);
        }}
        className="mt-3 w-full accent-clay"
      />
      <div className="mt-1 grid grid-cols-4 text-center text-[11px] font-medium">
        {["Любая", ...difficulties].map((label, i) => (
          <span key={label} className={i === index ? "text-[#8A4A2C]" : "text-ink-soft"}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
