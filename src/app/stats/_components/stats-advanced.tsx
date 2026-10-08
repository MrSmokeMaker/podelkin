"use client";

import { useEffect, useState } from "react";
import { Lock, Minus, TrendingUp } from "lucide-react";
import { PremiumBadge } from "@/components/premium-badge";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import type { Category } from "@/data/mockData";
import { categoryColors, formatMinutes, formatRub } from "@/lib/crafts";
import { PLAN_LABELS } from "@/lib/feature-flags";

interface PremiumStats {
  costBreakdownByCategory: { category: string; cost: number }[];
  timeBreakdownByDifficulty: { difficulty: string; minutes: number }[];
  savingsEstimate: number;
  topMaterialsWithTrend: { name: string; count: number; trend: "up" | "stable" }[];
}

const LOCKED_CARDS = [
  { title: "Стоимость по категориям", hint: "из чего складывается бюджет" },
  { title: "Время по сложности", hint: "легко / средне / сложно" },
  { title: "Экономия за счёт запасов", hint: "сколько покрывают ваши запасы" },
  { title: "Тренды материалов", hint: "что чаще всего берёте в работу" },
];

export function StatsAdvanced() {
  const { has } = useFeatureFlags();
  const [stats, setStats] = useState<PremiumStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.costBreakdownByCategory) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!has("advancedStats")) {
    return (
      <section
        aria-label="Расширенная аналитика"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Расширенная аналитика</h2>
          <PremiumBadge tooltip="Разбивка по стоимости и времени, экономия и тренды материалов — на тарифе Премиум" />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Дополнительные разрезы по стоимости, времени и материалам.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {LOCKED_CARDS.map(({ title, hint }) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl bg-paper-deep/60 p-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink/5">
                <Lock className="h-4 w-4 text-ink-soft" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
                <span
                  aria-disabled
                  className="mt-2 inline-flex min-h-9 items-center rounded-xl bg-ink/10 px-3 py-1.5 text-xs font-semibold text-ink-soft"
                >
                  С тарифа «Премиум»
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section
        aria-label="Расширенная аналитика"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <h2 className="text-lg font-bold">Расширенная аналитика</h2>
        <p className="mt-2 animate-pulse text-sm text-ink-soft">
          Считаем разбивки…
        </p>
      </section>
    );
  }

  const maxCost = Math.max(
    ...stats.costBreakdownByCategory.map((entry) => entry.cost),
    1
  );
  const totalTime = Math.max(
    stats.timeBreakdownByDifficulty.reduce((sum, entry) => sum + entry.minutes, 0),
    1
  );

  return (
    <section aria-label="Расширенная аналитика" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Расширенная аналитика</h2>
        <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-[#55693F]">
          Тариф «{PLAN_LABELS.premium}» активен
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
          <h3 className="text-sm font-bold">Экономия за счёт запасов</h3>
          <p className="mt-2 text-2xl font-bold">
            {formatRub(stats.savingsEstimate)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            оценка по всем материалам каталога, покрытым запасами
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
          <h3 className="text-sm font-bold">Время по сложности</h3>
          <ul className="mt-3 space-y-2.5">
            {stats.timeBreakdownByDifficulty.map(({ difficulty, minutes }) => (
              <li key={difficulty}>
                <div className="flex justify-between text-sm font-medium">
                  <span>{difficulty}</span>
                  <span className="text-ink-soft">{formatMinutes(minutes)}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-clay"
                    style={{ width: `${(minutes / totalTime) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
        <h3 className="text-sm font-bold">Стоимость по категориям</h3>
        <ul className="mt-4 space-y-3">
          {stats.costBreakdownByCategory.map(({ category, cost }) => (
            <li key={category}>
              <div className="flex justify-between text-sm font-medium">
                <span>{category}</span>
                <span className="text-ink-soft">{formatRub(cost)}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cost / maxCost) * 100}%`,
                    backgroundColor: categoryColors[category as Category],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
        <h3 className="text-sm font-bold">Тренды материалов</h3>
        <ol className="mt-4 space-y-2">
          {stats.topMaterialsWithTrend.map(({ name, count, trend }) => (
            <li
              key={name}
              className="flex items-center gap-3 rounded-xl bg-paper-deep/60 px-4 py-3 text-sm"
            >
              {trend === "up" ? (
                <TrendingUp
                  className="h-4 w-4 shrink-0 text-[#55693F]"
                  aria-hidden
                />
              ) : (
                <Minus className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
              )}
              <span className="font-medium">{name}</span>
              <span className="ml-auto shrink-0 text-ink-soft">
                в {count} МК · {trend === "up" ? "выше среднего" : "стабильно"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
