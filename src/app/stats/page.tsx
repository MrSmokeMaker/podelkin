import type { Metadata } from "next";
import { Boxes, Coins, Hammer, Timer } from "lucide-react";
import { crafts } from "@/lib/db";
import { collectCost } from "@/lib/cost-calculator";
import { craftMinutes, formatMinutes, formatRub } from "@/lib/crafts";
import { StatsAdvanced } from "./_components/stats-advanced";

export const metadata: Metadata = {
  title: "Статистика",
  description:
    "Сводка мастерской: базовые показатели для всех тарифов, расширенная аналитика для Premium.",
};

/* Базовая секция видна всем (totalCrafts, avgTime, avgCost, mostUsedMaterial).
   Расширенная аналитика — клиентский блок, гейтится фича-флагами:
   free видит его с бейджем Premium и заблокированными контролами. */

export default function StatsPage() {
  const totalCrafts = crafts.length;
  const avgTime = Math.round(
    crafts.reduce((sum, craft) => sum + craftMinutes(craft), 0) / totalCrafts
  );
  const avgCost =
    crafts.reduce((sum, craft) => sum + collectCost(craft).baseCost, 0) /
    totalCrafts;

  const usage = new Map<string, number>();
  for (const craft of crafts) {
    for (const material of craft.materials) {
      usage.set(material.name, (usage.get(material.name) ?? 0) + 1);
    }
  }
  const mostUsed = [...usage.entries()].sort((a, b) => b[1] - a[1])[0];

  const cards = [
    {
      icon: Hammer,
      tint: "bg-clay-soft text-[#8A4A2C]",
      label: "Всего мастер-классов",
      value: String(totalCrafts),
      hint: "доступно всем",
    },
    {
      icon: Timer,
      tint: "bg-mist-soft text-[#4A6D8C]",
      label: "Среднее время",
      value: formatMinutes(avgTime),
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
          Базовые показатели — для всех, детальная аналитика — для Premium
        </p>
      </header>

      <section aria-label="Базовая статистика">
        <h2 className="text-lg font-bold">Базовая статистика</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cards.map(({ icon: Icon, tint, label, value, hint }) => (
            <div
              key={label}
              className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}
              >
                <Icon className="h-6 w-6" aria-hidden />
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
      </section>

      <StatsAdvanced />
    </div>
  );
}
