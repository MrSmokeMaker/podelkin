import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PLAN_LABELS } from "@/lib/feature-flags";
import { listBoards, listCrafts, listInventory, listProjects } from "@/lib/db-server";
import { collectCost } from "@/lib/cost-calculator";
import { craftMinutes, formatMinutes, formatRub } from "@/lib/crafts";

export const dynamic = "force-dynamic";

/* GET /api/export/summary.txt — базовая сводка мастерской, доступна всем тарифам */

export async function GET(request: Request) {
  const user = getAuthUser(request);
  if (!user.features.allowed.includes("exportTxt")) {
    return NextResponse.json(
      { error: "Экспорт .txt недоступен для вашего тарифа" },
      { status: 403 }
    );
  }

  const [allCrafts, allInventory, allProjects, allBoards] = await Promise.all([
    listCrafts(),
    listInventory(),
    listProjects(),
    listBoards(),
  ]);
  const totalCrafts = allCrafts.length;

  const avgTime = Math.round(
    allCrafts.reduce((sum, craft) => sum + craftMinutes(craft), 0) / totalCrafts
  );
  const avgCost =
    allCrafts.reduce((sum, craft) => sum + collectCost(craft).baseCost, 0) /
    totalCrafts;

  const usage = new Map<string, number>();
  for (const craft of allCrafts) {
    for (const material of craft.materials) {
      usage.set(material.name, (usage.get(material.name) ?? 0) + 1);
    }
  }
  const mostUsed = [...usage.entries()].sort((a, b) => b[1] - a[1])[0];

  const lines = [
    "Podelkin — сводка мастерской",
    `Сгенерировано: ${new Date().toLocaleString("ru-RU")}`,
    `Тариф: ${PLAN_LABELS[user.role]}`,
    "",
    "МАСТЕР-КЛАССЫ",
    `Всего: ${totalCrafts}`,
    `Среднее время: ${formatMinutes(avgTime)}`,
    `Средняя стоимость материалов: ${formatRub(avgCost)}`,
    mostUsed
      ? `Самый ходовой материал: ${mostUsed[0]} (в ${mostUsed[1]} МК)`
      : "Самый ходовой материал: —",
    "",
    "ЗАПАСЫ",
    `Позиций: ${allInventory.length}, пустых: ${allInventory.filter((i) => i.stock === 0).length}`,
    "",
    "ПРОЕКТЫ",
    `Всего: ${allProjects.length} · в работе: ${allProjects.filter((p) => p.status === "в работе").length} · готовых: ${allProjects.filter((p) => p.status === "готов").length}`,
    "",
    `ДОСКИ: ${allBoards.length}`,
    "",
    "—",
    "Базовая сводка тарифа «Базовый».",
    "Расширенная аналитика и экспорт .csv — в тарифе «Премиум».",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rukodelie-summary.txt"',
    },
  });
}
