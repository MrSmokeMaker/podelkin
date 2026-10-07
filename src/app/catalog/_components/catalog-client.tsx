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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Каталог мастер-классов
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Найдено: {filtered.length} из {crafts.length}
        </p>
      </header>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Категория
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip
              active={category === null}
              onClick={() => setCategory(null)}
            >
              Все
            </FilterChip>
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(category === cat ? null : cat)}
                dotColor={categoryColors[cat]}
              >
                {cat}
              </FilterChip>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <fieldset className="flex-1">
            <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Сложность
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {difficulties.map((d) => (
                <FilterChip
                  key={d}
                  active={difficulty === d}
                  onClick={() => setDifficulty(difficulty === d ? null : d)}
                >
                  {d}
                </FilterChip>
              ))}
            </div>
          </fieldset>

          <fieldset className="sm:w-64">
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
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-ink-soft shadow-card ring-1 ring-ink/5">
          Ничего не нашлось — ослабьте фильтры.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((craft) => (
            <CraftCard key={craft.slug} craft={craft} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
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
        "flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-ink text-paper"
          : "bg-paper-deep text-ink-soft hover:bg-clay-soft hover:text-ink"
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
