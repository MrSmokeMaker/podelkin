"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryIcon, DIFFICULTY_STYLES } from "./catalog-visuals";
import type { CatalogItem } from "@/lib/catalog-db";

/* Константы продублированы локально: catalog-db лежит на сервере
   (там же in-memory хранилище), в бандл клиента попадают только типы. */
const CATEGORIES = [
  "бумажная модель",
  "деревянная заготовка",
  "3D-открытка",
  "игрушка",
  "макет",
  "декор",
] as const;
const DIFFICULTIES = ["легко", "средне", "сложно"] as const;
const SOURCES = ["Only Paper", "1001 Заготовка"] as const;

type SortKey = "new" | "title" | "time";

/* «40 мин» / «2 часа» / «6 часов» / «2 дня» -> минуты для сортировки. */
function assemblyMinutes(value: string): number {
  const match = value.match(/(\d+)\s*(мин|час|дн)/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("мин")) return amount;
  if (unit.startsWith("час")) return amount * 60;
  return amount * 1440;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-clay text-white shadow-card"
          : "bg-paper-deep text-ink hover:bg-clay-soft"
      )}
    >
      {children}
    </button>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onSelect: (next: string | null) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        <FilterChip active={value === null} onClick={() => onSelect(null)}>
          Все
        </FilterChip>
        {options.map((option) => (
          <FilterChip
            key={option}
            active={value === option}
            onClick={() => onSelect(value === option ? null : option)}
          >
            {option}
          </FilterChip>
        ))}
      </div>
    </fieldset>
  );
}

function ItemCard({ item }: { item: CatalogItem }) {
  const Icon = categoryIcon(item.category);
  return (
    <Link
      href={`/podelki/${item.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-card ring-1 ring-ink/5 transition-shadow hover:shadow-soft"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-paper-deep">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={`Превью: ${item.title}`}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        ) : (
          <Icon aria-hidden className="h-12 w-12 text-clay/50" />
        )}
      </div>
      <div className="space-y-2 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          {item.category}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
          {item.title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium text-ink",
              DIFFICULTY_STYLES[item.difficulty]
            )}
          >
            {item.difficulty}
          </span>
          {item.assemblyTime && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
              <Clock aria-hidden className="h-3.5 w-3.5" />
              {item.assemblyTime}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function PodelkiClient() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("new");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ items: CatalogItem[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    const result = items.filter((item) => {
      if (category && item.category !== category) return false;
      if (difficulty && item.difficulty !== difficulty) return false;
      if (source && item.sourceName !== source) return false;
      if (!lowerQuery) return true;
      const haystack = [item.title, ...item.tags].join(" ").toLowerCase();
      return haystack.includes(lowerQuery);
    });
    if (sort === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title, "ru"));
    } else if (sort === "time") {
      result.sort(
        (a, b) => assemblyMinutes(a.assemblyTime) - assemblyMinutes(b.assemblyTime)
      );
    } else {
      result.sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    }
    return result;
  }, [items, query, category, difficulty, source, sort]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Каталог поделок
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Модели и заготовки с Only Paper и 1001 Заготовки
          </p>
        </div>
        <Link
          href="/podelki/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white shadow-card transition-colors hover:bg-clay/90"
        >
          <Plus aria-hidden className="h-4 w-4" />
          Добавить
        </Link>
      </header>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию и тегам"
            className="w-full rounded-full border border-ink/10 bg-paper py-2 pl-9 pr-4 text-sm outline-none placeholder:text-ink-soft focus:border-clay"
          />
        </div>

        <ChipGroup
          label="Категория"
          options={CATEGORIES}
          value={category}
          onSelect={setCategory}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ChipGroup
            label="Сложность"
            options={DIFFICULTIES}
            value={difficulty}
            onSelect={setDifficulty}
          />
          <ChipGroup
            label="Источник"
            options={SOURCES}
            value={source}
            onSelect={setSource}
          />
          <fieldset className="sm:ml-auto">
            <label
              htmlFor="podelki-sort"
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              Сортировка
            </label>
            <select
              id="podelki-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="mt-2 block rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-sm outline-none focus:border-clay"
            >
              <option value="new">Сначала новые</option>
              <option value="title">По названию</option>
              <option value="time">По времени сборки</option>
            </select>
          </fieldset>
        </div>
      </div>

      {status === "loading" && (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-white p-8 text-sm text-ink-soft shadow-card ring-1 ring-ink/5">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Загружаем каталог…
        </p>
      )}

      {status === "error" && (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-ink-soft shadow-card ring-1 ring-ink/5">
          Не удалось загрузить каталог. Обновите страницу.
        </p>
      )}

      {status === "ready" && (
        <>
          <p className="text-sm text-ink-soft">
            Найдено: {filtered.length} из {items.length}
          </p>
          {filtered.length === 0 ? (
            <p className="rounded-2xl bg-white p-8 text-center text-ink-soft shadow-card ring-1 ring-ink/5">
              Ничего не нашлось — ослабьте фильтры или измените запрос.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
