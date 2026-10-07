import type { Metadata } from "next";
import { Boxes, Coins, Hammer, Timer } from "lucide-react";
import {
  categories,
  categoryColors,
  craftCost,
  craftMinutes,
  crafts,
  formatMinutes,
  formatRub,
} from "@/lib/crafts";
import { ProgressBar } from "@/components/progress";

export const metadata: Metadata = {
  title: "Статистика",
  description:
    "Сводка мастерской: сколько мастер-классов, средние время и стоимость, самые ходовые материалы.",
};

export default function StatsPage() {
  const totalCrafts = crafts.length;
  const avgMinutes =
    crafts.reduce((s, c) => s + craftMinutes(c), 0) / totalCrafts;
  const avgCost = crafts.reduce((s, c) => s + craftCost(c), 0) / totalCrafts;

  const materialUse = new Map<string, number>();
  for (const craft of crafts) {
    for (const m of craft.materials) {
      materialUse.set(m.name, (materialUse.get(m.name) ?? 0) + 1);
    }
  }
  const topMaterials = [...materialUse.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const mostUsed = topMaterials[0];

  const byCategory = categories
    .map((cat) => ({
      cat,
      count: crafts.filter((c) => c.category === cat).length,
    }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  const byDifficulty = (["Легко", "Средне", "Сложно"] as const).map((d) => ({
    d,
    count: crafts.filter((c) => c.difficulty === d).length,
  }));

  const maxCatCount = Math.max(...byCategory.map((e) => e.count));

  const cards = [
    {
      icon: Hammer,
      tint: "bg-clay-soft text-[#8A4A2C]",
      label: "Всего мастер-классов",
      value: String(totalCrafts),
      hint: `${byDifficulty[0].count} лёгких для старта`,
    },
    {
      icon: Timer,
      tint: "bg-mist-soft text-[#4A6D8C]",
      label: "Среднее время",
      value: formatMinutes(Math.round(avgMinutes)),
      hint: "по всем поделкам",
    },
    {
      icon: Coins,
      tint: "bg-sand-soft text-[#8A6A2F]",
      label: "Средняя стоимость",
      value: formatRub(avgCost),
      hint: "материалы на проект",
    },
    {
      icon: Boxes,
      tint: "bg-sage-soft text-[#55693F]",
      label: "Самый ходовой материал",
      value: mostUsed ? mostUsed[0] : "—",
      hint: mostUsed ? `нужен в ${mostUsed[1]} мастер-классах` : "",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Статистика мастерской
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Данные рассчитаны по каталогу мастер-классов
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ icon: Icon, tint, label, value, hint }) => (
          <div
            key={label}
            className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {label}
              </p>
              <p className="mt-1 truncate text-xl font-bold sm:text-2xl">
                {value}
              </p>
              {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
            </div>
          </div>
        ))}
      </div>

      <section
        aria-label="Мастер-классы по категориям"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <h2 className="text-lg font-bold">По категориям</h2>
        <ul className="mt-4 space-y-3">
          {byCategory.map(({ cat, count }) => (
            <li key={cat}>
              <div className="flex justify-between text-sm font-medium">
                <span>{cat}</span>
                <span className="text-ink-soft">{count}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / maxCatCount) * 100}%`,
                    backgroundColor: categoryColors[cat],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Мастер-классы по сложности"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <h2 className="text-lg font-bold">По сложности</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {byDifficulty.map(({ d, count }) => (
            <div key={d} className="rounded-2xl bg-paper-deep/60 p-4">
              <p className="text-sm font-semibold">{d}</p>
              <p className="mt-1 text-2xl font-bold">{count}</p>
              <ProgressBar
                className="mt-3"
                value={count}
                max={totalCrafts}
              />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Часто используемые материалы"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <h2 className="text-lg font-bold">Топ материалов</h2>
        <ol className="mt-4 space-y-2">
          {topMaterials.map(([name, count], i) => (
            <li
              key={name}
              className="flex items-center gap-3 rounded-xl bg-paper-deep/60 px-4 py-3 text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-soft text-xs font-bold text-[#8A4A2C]">
                {i + 1}
              </span>
              <span className="font-medium">{name}</span>
              <span className="ml-auto shrink-0 text-ink-soft">
                в {count} МК
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
