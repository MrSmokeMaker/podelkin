import type { Craft } from "@/data/mockData";
import { priceBook } from "@/lib/db";

/* Чистый калькулятор baseCost: материалы поделки + прайс-бук.
   Единицы веса/объёма/длины конвертируются к базовой единице прайса. */

export class CostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostError";
  }
}

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

export interface CostSource {
  name: string;
  qty: number;
  unit: string;
  baseQty: number;
  baseUnit: string;
  pricePerBase: number;
  cost: number;
  updatedAt: string;
}

export interface CostResult {
  baseCost: number;
  sources: CostSource[];
  missingPrices: string[];
  unitErrors: string[];
}

function convertQty(qty: number, fromUnit: string, baseUnit: string): number {
  if (fromUnit === baseUnit) return qty;
  const base = UNIT_TO_BASE[fromUnit];
  if (base !== baseUnit) {
    throw new CostError(
      `Несовместимые единицы для расчёта: материал в «${fromUnit}», прайс в «${baseUnit}»`
    );
  }
  return qty * UNIT_FACTOR[fromUnit];
}

/* Строгий режим по ТЗ: бросает CostError, если цены нет или единицы не сходятся */
export function computeBaseCost(craft: Craft): number {
  let total = 0;
  for (const material of craft.materials) {
    const item = priceBook.find((p) => p.name === material.name);
    if (!item) {
      throw new CostError(`Нет цены в прайс-букe: «${material.name}»`);
    }
    total += convertQty(material.qty, material.unit, item.baseUnit) * item.price;
  }
  return Math.round(total * 100) / 100;
}

/* Мягкий режим для UI/API: собирает всё, что удалось посчитать,
   и явно перечисляет материалы без цены */
export function collectCost(craft: Craft): CostResult {
  const sources: CostSource[] = [];
  const missingPrices: string[] = [];
  const unitErrors: string[] = [];
  let baseCost = 0;

  for (const material of craft.materials) {
    const item = priceBook.find((p) => p.name === material.name);
    if (!item) {
      missingPrices.push(material.name);
      continue;
    }
    try {
      const baseQty = convertQty(material.qty, material.unit, item.baseUnit);
      const cost = baseQty * item.price;
      baseCost += cost;
      sources.push({
        name: material.name,
        qty: material.qty,
        unit: material.unit,
        baseQty,
        baseUnit: item.baseUnit,
        pricePerBase: item.price,
        cost: Math.round(cost * 100) / 100,
        updatedAt: item.updatedAt,
      });
    } catch {
      unitErrors.push(`${material.name}: ${material.unit} ↔ ${item.baseUnit}`);
    }
  }

  return {
    baseCost: Math.round(baseCost * 100) / 100,
    sources,
    missingPrices,
    unitErrors,
  };
}
