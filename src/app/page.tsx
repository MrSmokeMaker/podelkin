"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Crown, Dices, RefreshCw, Sparkles } from "lucide-react";
import { CraftPhoto } from "@/components/craft-photo";
import { useToast } from "@/components/toast";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import {
  categoryIcon,
  DIFFICULTY_STYLES,
} from "@/app/podelki/_components/catalog-visuals";
import type { CatalogItem } from "@/lib/catalog-db";
import {
  crafts,
  craftMinutes,
  difficultyTone,
  formatMinutes,
  stockOf,
  type Craft,
} from "@/lib/crafts";
import { cn } from "@/lib/utils";

const DIFFICULTY_ORDER: Craft["difficulty"][] = ["Легко", "Средне", "Сложно"];

/* Насколько поделка «из твоих запасов»: доля материалов, которых хватает без докупки. */
function coverageOf(craft: Craft): number {
  if (craft.materials.length === 0) return 0;
  const covered = craft.materials.filter((m) => stockOf(m.name) >= m.qty).length;
  return covered / craft.materials.length;
}

function byStockFit(a: Craft, b: Craft): number {
  const byCoverage = coverageOf(b) - coverageOf(a);
  if (byCoverage !== 0) return byCoverage;
  const byDifficulty =
    DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
  if (byDifficulty !== 0) return byDifficulty;
  return a.title.localeCompare(b.title, "ru");
}

/* Подзаголовок «Из: …» — материалы, которые уже лежат на полке. */
function stockNames(craft: Craft): string {
  const owned = craft.materials
    .filter((m) => stockOf(m.name) > 0)
    .map((m) => m.name);
  const names = owned.length > 0 ? owned : craft.materials.map((m) => m.name);
  return names.slice(0, 2).join(", ");
}

/* Единая форма карточки «сегодня»: мастер-класс или поделка из каталога
   (добавленная вручную или автозагрузка из источников). */
interface TodayIdea {
  key: string;
  kind: "craft" | "catalog";
  href: string;
  title: string;
  description: string;
  difficulty: string;
  difficultyClass: string;
  minutes: string | null;
  steps: number | null;
  origin: string | null;
  craft?: Craft;
  thumbnail?: string | null;
  category?: string;
}

function craftToIdea(craft: Craft): TodayIdea {
  return {
    key: craft.slug,
    kind: "craft",
    href: `/craft/${craft.slug}`,
    title: craft.title,
    description: craft.description,
    difficulty: craft.difficulty,
    difficultyClass: difficultyTone[craft.difficulty],
    minutes: formatMinutes(craftMinutes(craft)),
    steps: craft.steps.length,
    origin: null,
    craft,
  };
}

function catalogToIdea(item: CatalogItem): TodayIdea {
  const difficulty =
    item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1);
  return {
    key: `pod-${item.id}`,
    kind: "catalog",
    href: `/podelki/${item.id}`,
    title: item.title,
    description: item.description,
    difficulty,
    difficultyClass: cn(DIFFICULTY_STYLES[item.difficulty], "text-ink"),
    minutes: item.assemblyTime || null,
    steps: item.instructions?.length ?? null,
    origin: item.sourceName,
    thumbnail: item.thumbnail,
    category: item.category,
  };
}

export default function HomePage() {
  const router = useRouter();
  const showToast = useToast();
  const { has } = useFeatureFlags();
  const canRandomCraft = has("randomCraft");

  const ranked = useMemo(() => [...crafts].sort(byStockFit), []);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [pickingRandom, setPickingRandom] = useState(false);

  /* Уже добавленные поделки (из источников) подтягиваются на клиенте,
     чтобы первый кадр совпадал с серверным рендером. */
  useEffect(() => {
    let alive = true;
    fetch("/api/catalog")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: CatalogItem[] } | null) => {
        if (alive && data?.items) setCatalog(data.items);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pool = useMemo(
    () => [...ranked.map(craftToIdea), ...catalog.map(catalogToIdea)],
    [ranked, catalog]
  );

  const today = pool[offset % pool.length];
  const start = offset % ranked.length;
  const rotated = [...ranked.slice(start), ...ranked.slice(0, start)];
  const ideas = rotated
    .filter((craft) => craft.slug !== today.key)
    .slice(0, 4);

  const refresh = () => {
    if (pool.length < 2) return;
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 500);
    let next = offset;
    while (next === offset) next = Math.floor(Math.random() * pool.length);
    setOffset(next);
  };

  /* Выбор случайной поделки строго с сайта «Своими Руками» (svoimirukamy.com).
     Запрос идёт напрямую к сайту в реальном времени. Доступно в тарифах Премиум и Директор. */
  const handleRandomCraft = async () => {
    if (!canRandomCraft) {
      showToast(
        "Функция доступна в тарифах Премиум и Директор",
        "Оформите подписку, чтобы находить случайные поделки напрямую со «Своими Руками»"
      );
      router.push("/billing");
      return;
    }

    try {
      setPickingRandom(true);
      const res = await fetch("/api/catalog/random");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403) {
          showToast(
            "Нужен платный тариф",
            data.error || "Переходим к выбору тарифа..."
          );
          router.push("/billing");
          return;
        }
        throw new Error(data.error || "Не удалось загрузить поделку");
      }

      const data = await res.json();
      if (data.item?.id) {
        showToast("Поделка со «Своими Руками» найдена!", data.item.title);
        router.push(`/podelki/${data.item.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Попробуйте ещё раз чуть позже";
      showToast("Ошибка поиска поделки", message);
    } finally {
      setPickingRandom(false);
    }
  };

  const TodayIcon = today.category ? categoryIcon(today.category) : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Блок «Случайная поделка» напрямую со svoimirukamy.com */}
      <div className="relative overflow-hidden rounded-3xl border border-clay/15 bg-gradient-to-r from-clay/10 via-amber-500/10 to-clay/5 p-4 sm:p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay text-white shadow-md shadow-clay/25">
              <Dices className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-ink">
                  Случайная поделка
                </span>
                <span className="rounded-full bg-clay/15 px-2.5 py-0.5 text-xs font-semibold text-clay">
                  Прямо со Своими Руками
                </span>
                {!canRandomCraft && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#DDB771] to-[#C98DA4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-xs">
                    <Crown className="h-3 w-3" aria-hidden />
                    PRO
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
                Выбирается в реальном времени напрямую с сайта svoimirukamy.com
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRandomCraft}
            disabled={pickingRandom}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-60",
              canRandomCraft
                ? "bg-clay text-white shadow-clay/25 hover:bg-[#8A4A2C]"
                : "bg-ink text-paper hover:bg-ink-soft"
            )}
          >
            {pickingRandom ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                <span>Ищем на сайте...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-amber-300" aria-hidden />
                <span>{canRandomCraft ? "Случайная поделка" : "Открыть (Премиум)"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      <section aria-labelledby="today-heading">
        <div className="flex items-center justify-between gap-3">
          <h1
            id="today-heading"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Что сделать сегодня?
          </h1>
          <button
            type="button"
            onClick={refresh}
            aria-label="Показать другой вариант"
            title="Другой вариант"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-clay shadow-card ring-1 ring-ink/5 transition hover:bg-clay-soft/50 active:scale-95"
          >
            <RefreshCw
              aria-hidden
              className={cn("h-5 w-5", spinning && "animate-spin")}
            />
          </button>
        </div>
        <Link
          key={today.key}
          href={today.href}
          className="group mt-3 flex animate-card-in gap-4 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition hover:shadow-soft sm:gap-5 sm:p-4"
        >
          {today.craft ? (
            <CraftPhoto
              craft={today.craft}
              className="h-24 w-24 shrink-0 sm:h-32 sm:w-32"
              rounded="rounded-2xl"
            />
          ) : (
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-paper-deep sm:h-32 sm:w-32">
              {today.thumbnail ? (
                <img
                  src={today.thumbnail}
                  alt={`Превью: ${today.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  {TodayIcon && (
                    <TodayIcon aria-hidden className="h-12 w-12 text-clay/50" />
                  )}
                </span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold leading-snug group-hover:text-[#8A4A2C] sm:text-xl">
                {today.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${today.difficultyClass}`}
              >
                {today.difficulty}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
              {today.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-soft">
              {today.minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-clay" aria-hidden />
                  {today.minutes}
                </span>
              )}
              {today.steps !== null && (
                <span className="hidden sm:inline">
                  {today.steps} шагов
                </span>
              )}
              {today.origin && (
                <span className="font-semibold text-clay">
                  Источник: {today.origin}
                </span>
              )}
            </div>
          </div>
        </Link>
      </section>

      <section aria-labelledby="ideas-heading">
        <h2
          id="ideas-heading"
          className="text-lg font-bold tracking-tight sm:text-xl"
        >
          Идеи из твоих запасов
        </h2>
        <ul className="scrollbar-none -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {ideas.map((craft) => (
            <li key={craft.slug} className="w-36 shrink-0 snap-start sm:w-40">
              <Link
                href={`/craft/${craft.slug}`}
                className="group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition hover:shadow-soft"
              >
                <CraftPhoto
                  craft={craft}
                  className="aspect-square w-full"
                  rounded="rounded-none"
                />
                <div className="p-2.5">
                  <h3 className="line-clamp-1 text-sm font-bold group-hover:text-[#8A4A2C]">
                    {craft.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-xs text-ink-soft">
                    Из: {stockNames(craft)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
