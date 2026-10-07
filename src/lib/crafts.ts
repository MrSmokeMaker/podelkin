import {
  crafts,
  inventory,
  type Category,
  type Craft,
  type Difficulty,
  type Material,
} from "@/data/mockData";

export { crafts, inventory };
export type { Category, Craft, Difficulty, Material };

export const categories: Category[] = [
  "Пряжа",
  "Ткань",
  "Бумага",
  "Дерево",
  "Глина",
  "Свечи",
  "Смола",
  "Мыло",
  "Шерсть",
];

export const categoryColors: Record<Category, string> = {
  Пряжа: "#9CAF88",
  Ткань: "#C98DA4",
  Бумага: "#8FAEC7",
  Дерево: "#B08968",
  Глина: "#C77B58",
  Свечи: "#DDB771",
  Смола: "#86A8AE",
  Мыло: "#B5A8D5",
  Шерсть: "#DE9A64",
};

export const difficultyTone: Record<Difficulty, string> = {
  Легко: "bg-sage-soft text-[#55693F]",
  Средне: "bg-sand-soft text-[#8A6A2F]",
  Сложно: "bg-blush-soft text-[#9C5570]",
};

export function getCraft(slug: string): Craft | undefined {
  return crafts.find((c) => c.slug === slug);
}

export function craftMinutes(craft: Craft): number {
  return craft.steps.reduce((sum, step) => sum + step.minutes, 0);
}

export function craftCost(craft: Craft): number {
  return craft.materials.reduce((sum, m) => sum + m.qty * m.price, 0);
}

export function stockOf(name: string): number {
  return inventory.find((i) => i.name === name)?.stock ?? 0;
}

export interface MissingItem {
  material: Material;
  missing: number;
  cost: number;
}

export function missingItems(craft: Craft): MissingItem[] {
  return craft.materials
    .map((material) => {
      const missing = Math.max(0, material.qty - stockOf(material.name));
      return { material, missing, cost: missing * material.price };
    })
    .filter((item) => item.missing > 0);
}

export function missingTotal(craft: Craft): number {
  return missingItems(craft).reduce((sum, item) => sum + item.cost, 0);
}

export type StockTone = "ok" | "low" | "none";

export function stockStatus(
  name: string,
  need: number,
  unit: string
): { label: string; tone: StockTone } {
  const have = stockOf(name);
  if (have >= need) {
    return { label: `В запасах: ${formatQty(have)} ${unit}`, tone: "ok" };
  }
  if (have > 0) {
    return {
      label: `Есть ${formatQty(have)}, не хватает ${formatQty(need - have)}`,
      tone: "low",
    };
  }
  return { label: "Нет в запасах", tone: "none" };
}

export function exportListText(craft: Craft): string {
  const missing = missingItems(craft);
  const lines = [`Список покупок — ${craft.title}`, ""];
  if (missing.length === 0) {
    lines.push("Всё необходимое уже есть в запасах!");
  } else {
    lines.push("Докупить:");
    for (const { material, missing: qty, cost } of missing) {
      lines.push(
        `• ${material.name} — ${formatQty(qty)} ${material.unit} (${formatRub(cost)})`
      );
    }
    lines.push("", `Итого: ${formatRub(missingTotal(craft))}`);
  }
  return lines.join("\n");
}

const qtyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
});

export function formatQty(qty: number): string {
  return qtyFormatter.format(qty);
}

export function formatRub(amount: number): string {
  return `${qtyFormatter.format(Math.round(amount))} ₽`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}
