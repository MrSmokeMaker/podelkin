import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { CraftPhoto } from "@/components/craft-photo";
import {
  crafts,
  craftMinutes,
  difficultyTone,
  formatMinutes,
  stockOf,
  type Craft,
} from "@/lib/crafts";

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

export default function HomePage() {
  const ranked = [...crafts].sort(byStockFit);
  const today = ranked[0];
  const ideas = ranked.slice(1, 5);

  return (
    <div className="space-y-9">
      <section aria-labelledby="today-heading">
        <h1
          id="today-heading"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Что сделать сегодня?
        </h1>
        <Link
          href={`/craft/${today.slug}`}
          className="group mt-4 flex gap-4 rounded-3xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition hover:shadow-soft sm:gap-6 sm:p-5"
        >
          <CraftPhoto
            craft={today}
            className="h-28 w-28 shrink-0 sm:h-44 sm:w-44"
            rounded="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold leading-snug group-hover:text-[#8A4A2C] sm:text-xl">
                {today.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${difficultyTone[today.difficulty]}`}
              >
                {today.difficulty}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft sm:line-clamp-3">
              {today.description}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-soft">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-clay" aria-hidden />
                {formatMinutes(craftMinutes(today))}
              </span>
              <span className="hidden sm:inline">
                {today.steps.length} шагов
              </span>
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
        <ul className="scrollbar-none -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          {ideas.map((craft) => (
            <li key={craft.slug} className="w-40 shrink-0 snap-start sm:w-44">
              <Link
                href={`/craft/${craft.slug}`}
                className="group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5 transition hover:shadow-soft"
              >
                <CraftPhoto
                  craft={craft}
                  className="aspect-square w-full"
                  rounded="rounded-none"
                />
                <div className="p-3">
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

      <Link
        href="/inventory"
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A4A2C] hover:underline"
      >
        Все мои запасы
        <ArrowRight
          className="h-4 w-4 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </div>
  );
}
