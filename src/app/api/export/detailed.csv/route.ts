import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listCrafts, listProjects } from "@/lib/db-server";
import { collectCost } from "@/lib/cost-calculator";

export const dynamic = "force-dynamic";

/* GET /api/export/detailed.csv — только premium: время по каждому шагу,
   стоимость материалов с датой цены и отклонение факта от плана. */

const SEP = ";";

function csvCell(value: string | number): string {
  const text = String(value);
  return /["\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(SEP);
}

export async function GET(request: Request) {
  const user = getAuthUser(request);
  if (!user.features.allowed.includes("exportCsv")) {
    return NextResponse.json(
      {
        error:
          "Экспорт .csv доступен на тарифах «Премиум» и «Директор». Оформите подписку в разделе «Тарифы».",
      },
      { status: 403 }
    );
  }

  const [allCrafts, allProjects] = await Promise.all([
    listCrafts(),
    listProjects(),
  ]);

  const rows: string[] = [];

  /* Время по шагам проектов: план (МК) против факта (записанное время) */
  rows.push(
    csvRow(["Проект", "Поделка", "Шаг", "План, мин", "Факт, мин", "Отклонение, мин"])
  );
  for (const project of allProjects) {
    const craft = allCrafts.find((c) => c.slug === project.craftSlug);
    if (!craft) continue;
    project.steps.forEach((step, i) => {
      const planned = craft.steps[i]?.minutes ?? 0;
      rows.push(
        csvRow([
          project.id,
          project.craftTitle,
          i + 1,
          planned,
          step.minutesSpent,
          step.minutesSpent - planned,
        ])
      );
    });
  }

  /* Стоимость материалов каталога: из прайс-бука, с датой актуализации */
  rows.push("");
  rows.push(
    csvRow([
      "Поделка",
      "Материал",
      "Кол-во",
      "Ед.",
      "Цена за ед., ₽",
      "Стоимость, ₽",
      "Дата цены",
    ])
  );
  for (const craft of allCrafts) {
    for (const source of collectCost(craft).sources) {
      rows.push(
        csvRow([
          craft.title,
          source.name,
          source.qty,
          source.unit,
          source.pricePerBase,
          source.cost,
          source.updatedAt,
        ])
      );
    }
  }

  /* BOM — чтобы Excel корректно открыл кириллицу */
  const csv = "\uFEFF" + rows.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rukodelie-detailed.csv"',
    },
  });
}
