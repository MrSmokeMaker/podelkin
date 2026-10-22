import { NextResponse } from "next/server";
import type { Craft } from "@/data/mockData";
import { listCrafts, listInventory } from "@/lib/db-server";

export const dynamic = "force-dynamic";

/* Обратный поиск: какие поделки можно делать прямо сейчас из имеющихся запасов.
   Необязательных материалов в каталоге нет — все считаются обязательными. */

const UNIT_TO_BASE: Record<string, string> = {
  "кг": "кг",
  "г": "кг",
  "л": "л",
  "мл": "л",
  "м": "м",
  "см": "м",
};

const UNIT_FACTOR: Record<string, number> = {
  "кг": 1,
  "г": 0.001,
  "л": 1,
  "мл": 0.001,
  "м": 1,
  "см": 0.01,
};

function stockInUnit(stock: number, stockUnit: string, needUnit: string): number {
  if (stockUnit === needUnit) return stock;
  if (UNIT_TO_BASE[stockUnit] && UNIT_TO_BASE[stockUnit] === UNIT_TO_BASE[needUnit]) {
    return stock * UNIT_FACTOR[stockUnit] / UNIT_FACTOR[needUnit];
  }
  return 0;
}

interface MissingItem {
  name: string;
  missing: number;
  unit: string;
  cost: number;
}

function coverageFor(craft: Craft, inventory: { name: string; stock: number; unit: string }[]) {
  const missingItems: MissingItem[] = [];
  let missingTotal = 0;

  for (const material of craft.materials) {
    const record = inventory.find((i) => i.name === material.name);
    const available = record
      ? stockInUnit(record.stock, record.unit, material.unit)
      : 0;
    const missing = Math.max(0, material.qty - available);
    if (missing > 0) {
      const cost = Math.round(missing * material.price * 100) / 100;
      missingItems.push({
        name: material.name,
        missing: Math.round(missing * 1000) / 1000,
        unit: material.unit,
        cost,
      });
      missingTotal += cost;
    }
  }

  return { missingItems, missingTotal: Math.round(missingTotal * 100) / 100 };
}

export async function GET() {
  const [crafts, inventory] = await Promise.all([listCrafts(), listInventory()]);
  const results = crafts
    .map((craft) => {
      const { missingItems, missingTotal } = coverageFor(craft, inventory);
      return {
        slug: craft.slug,
        title: craft.title,
        category: craft.category,
        difficulty: craft.difficulty,
        covered: missingItems.length === 0,
        missingCount: missingItems.length,
        missingItems,
        missingTotal,
      };
    })
    .sort((a, b) => {
      if (a.covered !== b.covered) return a.covered ? -1 : 1;
      return a.missingTotal - b.missingTotal;
    });

  return NextResponse.json({
    total: results.length,
    coveredNow: results.filter((r) => r.covered).length,
    results,
  });
}
