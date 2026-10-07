import { NextResponse } from "next/server";
import type { Material } from "@/data/mockData";
import { boards, crafts, inventory, priceBook, projects } from "@/lib/db";
import { collectCost } from "@/lib/cost-calculator";
import { craftMinutes, formatRub } from "@/lib/crafts";

export const dynamic = "force-dynamic";

/* Сводная статистика: расходы, средние показатели, топ материалов,
   оценка экономии за счёт запасов. Цены — из прайс-бука с датой. */

function coveredValue(craftMaterials: Material[]): number {
  let value = 0;
  for (const material of craftMaterials) {
    const record = inventory.find((i) => i.name === material.name);
    const priceItem = priceBook.find((p) => p.name === material.name);
    if (!record || !priceItem) continue;
    const used = Math.min(record.stock, material.qty);
    /* цена в прайсе за baseUnit; для штучных позиций baseUnit совпадает с unit */
    const perUnit = priceItem.baseUnit === material.unit
      ? priceItem.price
      : material.price;
    value += used * perUnit;
  }
  return Math.round(value * 100) / 100;
}

export function GET() {
  const totalCrafts = crafts.length;
  const avgMinutes =
    crafts.reduce((sum, craft) => sum + craftMinutes(craft), 0) / totalCrafts;
  const costs = crafts.map((craft) => collectCost(craft));
  const avgCost =
    costs.reduce((sum, cost) => sum + cost.baseCost, 0) / totalCrafts;

  const usage = new Map<string, number>();
  for (const craft of crafts) {
    for (const material of craft.materials) {
      usage.set(material.name, (usage.get(material.name) ?? 0) + 1);
    }
  }
  const mostUsedMaterials = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const plannedSpend = costs.reduce((sum, cost) => sum + cost.baseCost, 0);
  const savings = projects.reduce((sum, project) => {
    const craft = crafts.find((c) => c.slug === project.craftSlug);
    return sum + (craft ? coveredValue(craft.materials) : 0);
  }, 0);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    priceBook: {
      size: priceBook.length,
      pricesUpdatedAt: priceBook[0]?.updatedAt ?? null,
    },
    catalog: {
      totalCrafts,
      avgMinutes: Math.round(avgMinutes),
      avgCost: Math.round(avgCost),
      avgCostLabel: formatRub(avgCost),
    },
    inventory: {
      items: inventory.length,
      empty: inventory.filter((i) => i.stock === 0).length,
    },
    projects: {
      total: projects.length,
      finished: projects.filter((p) => p.status === "готов").length,
      inProgress: projects.filter((p) => p.status === "в работе").length,
      minutesSpent: projects.reduce(
        (sum, p) => sum + p.steps.reduce((s, step) => s + step.minutesSpent, 0),
        0
      ),
    },
    boards: boards.length,
    spend: {
      planned: Math.round(plannedSpend),
      savingsFromStock: Math.round(savings),
      missingPrices: [...new Set(costs.flatMap((c) => c.missingPrices))],
    },
    mostUsedMaterials,
  });
}
