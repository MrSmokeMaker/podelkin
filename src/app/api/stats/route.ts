import { NextResponse } from "next/server";
import type { Difficulty } from "@/data/mockData";
import { getAuthUser } from "@/lib/auth";
import { listCrafts, listInventory } from "@/lib/db-server";
import { collectCost } from "@/lib/cost-calculator";
import { craftMinutes } from "@/lib/crafts";

export const dynamic = "force-dynamic";

/* GET /api/stats?role=free|premium|admin
   free — только базовые поля (totalCrafts, avgTime, avgCost, mostUsedMaterial);
   premium/admin — плюс расширенная аналитика. Права решает мок-аутентификация. */

const DIFFICULTIES: Difficulty[] = ["Легко", "Средне", "Сложно"];

export async function GET(request: Request) {
  const user = getAuthUser(request);
  const allCrafts = await listCrafts();
  const allInventory = await listInventory();
  const totalCrafts = allCrafts.length;

  const avgTime = Math.round(
    allCrafts.reduce((sum, craft) => sum + craftMinutes(craft), 0) / totalCrafts
  );
  const costs = allCrafts.map((craft) => collectCost(craft));
  const avgCost = costs.reduce((sum, cost) => sum + cost.baseCost, 0) / totalCrafts;

  const usage = new Map<string, number>();
  for (const craft of allCrafts) {
    for (const material of craft.materials) {
      usage.set(material.name, (usage.get(material.name) ?? 0) + 1);
    }
  }
  const mostUsed = [...usage.entries()].sort((a, b) => b[1] - a[1])[0];

  const payload: Record<string, unknown> = {
    role: user.role,
    generatedAt: new Date().toISOString(),
    totalCrafts,
    avgTime,
    avgCost: Math.round(avgCost),
    mostUsedMaterial: mostUsed ? { name: mostUsed[0], count: mostUsed[1] } : null,
  };

  if (!user.features.allowed.includes("advancedStats")) {
    return NextResponse.json(payload);
  }

  /* --- Расширенная аналитика: только premium/admin --- */

  const costByCategory = new Map<string, number>();
  const timeByDifficulty = new Map<Difficulty, number>();
  for (const craft of allCrafts) {
    costByCategory.set(
      craft.category,
      (costByCategory.get(craft.category) ?? 0) + collectCost(craft).baseCost
    );
    timeByDifficulty.set(
      craft.difficulty,
      (timeByDifficulty.get(craft.difficulty) ?? 0) + craftMinutes(craft)
    );
  }

  let savingsEstimate = 0;
  for (const craft of allCrafts) {
    for (const material of craft.materials) {
      const stock = allInventory.find((i) => i.name === material.name)?.stock ?? 0;
      savingsEstimate += Math.min(stock, material.qty) * material.price;
    }
  }

  const avgUsage =
    [...usage.values()].reduce((sum, count) => sum + count, 0) / usage.size;
  const topMaterialsWithTrend = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      /* Тренд — плейсхолдер до накопления истории использования */
      trend: count > avgUsage ? ("up" as const) : ("stable" as const),
    }));

  return NextResponse.json({
    ...payload,
    costBreakdownByCategory: [...costByCategory.entries()]
      .map(([category, cost]) => ({ category, cost: Math.round(cost) }))
      .sort((a, b) => b.cost - a.cost),
    timeBreakdownByDifficulty: DIFFICULTIES.map((difficulty) => ({
      difficulty,
      minutes: timeByDifficulty.get(difficulty) ?? 0,
    })),
    savingsEstimate: Math.round(savingsEstimate),
    topMaterialsWithTrend,
  });
}
