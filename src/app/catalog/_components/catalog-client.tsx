"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Clock, Layers, Sparkles } from "lucide-react";
import { CraftCard } from "@/components/craft-card";
import { CraftPhoto } from "@/components/craft-photo";
import {
  categories,
  categoryColors,
  crafts,
  type Category,
  type Difficulty,
} from "@/lib/crafts";
import type { CatalogItem } from "@/lib/catalog-db";
import { cn } from "@/lib/utils";

const difficulties: Difficulty[] = ["Легко", "Средне", "Сложно"];

export function CatalogClient() {
  const [tab, setTab] = useState<"crafts" | "sources">("sources");
  const [category, setCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [maxCost, setMaxCost] = useState<number | null>(null);

  // Поделки из внешних источников (84 штуки)
  const [sourceItems, setSourceItems] = useState<CatalogItem[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d: { items?: CatalogItem[] }) => {
        if (d.items) setSourceItems(d.items);
      })
      .catch(() => {});
  }, []);

  // Фильтр для мастер-классов (55 штук)
  const filteredCrafts = useMemo(
    () =>
      crafts.filter(
        (c) =>
          (!category || c.category === category) &&
          (!difficulty || c.difficulty === difficulty) &&
          (maxCost === null || c.materials.reduce((s, m) => s + m.qty * m.price, 0) <= maxCost)
      ),
    [category, difficulty, maxCost]
  );

  // Фильтр для поделок из интернета (84 штуки)
  const filteredSources = useMemo(
    () =>
      sourceItems.filter(
        (item) => !sourceFilter || item.sourceName === sourceFilter
      ),
    [sourceItems, sourceFilter]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Каталог поделок</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Большая коллекция: авторские мастер-классы и поделки из проверенных источников
        </p>

        {/* Переключатель вкладок */}
        <div className="mt-4 flex rounded-xl bg-ink/5 p-1 max-w-md">
          <button
            type="button"
            onClick={() => setTab("sources")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
              tab === "sources"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            )}
          >
            <Sparkles className="h-4 w-4 text-clay" />
            Из источников ({sourceItems.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("crafts")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
              tab === "crafts"
                ? "bg-white text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            )}
          >
            <Layers className="h-4 w-4 text-clay" />
            Мастер-классы ({crafts.length})
          </button>
        </div>
      </header>

      {/* ВКЛАДКА 1: Поделки из источников (84 штуки) */}
      {tab === "sources" && (
        <div className="space-y-5">
          {/* Фильтр по сайтам-источникам */}
          <div className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-1">
            <div className="flex w-max gap-2">
              <button
                type="button"
                onClick={() => setSourceFilter(null)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-transform active:scale-95",
                  sourceFilter === null
                    ? "border-clay bg-white text-[#8A4A2C] shadow-sm"
                    : "border-ink/10 bg-white text-ink-soft hover:border-clay/40"
                )}
              >
                Все источники ({sourceItems.length})
              </button>
              {["Своими Руками", "Сделай Сам", "1001 Заготовка", "Only Paper"].map((src) => {
                const count = sourceItems.filter((i) => i.sourceName === src).length;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-transform active:scale-95",
                      sourceFilter === src
                        ? "border-clay bg-white text-[#8A4A2C] shadow-sm"
                        : "border-ink/10 bg-white text-ink-soft hover:border-clay/40"
                    )}
                  >
                    {src} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSources.map((item) => (
              <article
                key={item.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition-all hover:shadow-lg hover:ring-ink/15"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
                    <span className="rounded-md bg-paper px-2 py-1 text-ink">
                      {item.sourceName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.assemblyTime}
                    </span>
                  </div>

                  {item.thumbnail && (
                    <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-ink/5">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  <h3 className="mt-3 text-base font-bold text-ink line-clamp-2 group-hover:text-clay transition-colors">
                    {item.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-ink-soft line-clamp-2">
                    {item.description}
                  </p>

                  {item.materials && item.materials.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.materials.slice(0, 3).map((mat, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-medium text-ink-soft"
                        >
                          {mat}
                        </span>
                      ))}
                      {item.materials.length > 3 && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
                          +{item.materials.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-ink/5 bg-paper/50 px-4 py-3 flex items-center justify-between">
                  <Link
                    href={`/podelki/${item.id}`}
                    className="text-xs font-semibold text-clay hover:underline"
                  >
                    Открыть инструкцию →
                  </Link>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-soft hover:text-ink text-xs flex items-center gap-1"
                  >
                    Источник <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ВКЛАДКА 2: Мастер-классы студии (55 штук) */}
      {tab === "crafts" && (
        <div className="space-y-6">
          <div
            role="group"
            aria-label="Категории"
            className="scrollbar-none -mx-4 overflow-x-auto px-4 pb-1"
          >
            <div className="flex w-max gap-2">
              <CategoryChip active={category === null} onClick={() => setCategory(null)}>
                Все ({crafts.length})
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCrafts.map((craft, index) => (
              <CraftCard key={craft.slug} craft={craft} index={index} />
            ))}
          </div>
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
        onChange={(e) => {
          const i = Number(e.target.value);
          onChange(i === 0 ? null : difficulties[i - 1]);
        }}
        className="mt-3 w-full accent-clay"
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-soft">
        <span>Любая</span>
        <span>Легко</span>
        <span>Средне</span>
        <span>Сложно</span>
      </div>
    </div>
  );
}
