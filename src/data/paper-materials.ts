import type { Material, StockItem } from "./mockData";

interface Template {
  name: string;
  unit: string;
  price: number;
}

/* Единый справочник расходников для бумажных мастер-классов:
   названия совпадают с записями запасов, чтобы «Идеи из твоих запасов»
   и список покупок считались корректно. */
const templates = {
  colorPaper: { name: "Цветная бумага А4", unit: "лист", price: 5 },
  whitePaper: { name: "Белая бумага А4", unit: "лист", price: 4 },
  colorCard: { name: "Цветной картон А4", unit: "лист", price: 15 },
  whiteCard: { name: "Белый картон А4", unit: "лист", price: 12 },
  gofro: { name: "Гофрированная бумага", unit: "рулон", price: 90 },
  tube: { name: "Картонная втулка", unit: "шт", price: 0 },
  glueStick: { name: "Клей-карандаш", unit: "шт", price: 60 },
  pva: { name: "Клей ПВА", unit: "мл", price: 3 },
  tape: { name: "Двусторонний скотч", unit: "рулон", price: 80 },
  markers: { name: "Фломастеры (набор)", unit: "набор", price: 250 },
  ribbons: { name: "Лента атласная", unit: "м", price: 25 },
  twine: { name: "Шпагат джутовый", unit: "м", price: 4 },
  beads: { name: "Бусины деревянные", unit: "шт", price: 5 },
  buttons: { name: "Пуговицы", unit: "шт", price: 5 },
  magnets: { name: "Магниты плоские", unit: "шт", price: 20 },
  napkins: { name: "Салфетки бумажные", unit: "шт", price: 1 },
  newspaper: { name: "Газеты", unit: "лист", price: 2 },
  magazines: { name: "Старые журналы", unit: "шт", price: 0 },
  pins: { name: "Канцелярские кнопки", unit: "шт", price: 1 },
  clips: { name: "Скрепки канцелярские", unit: "шт", price: 1 },
  acrylic: { name: "Акриловая краска", unit: "бан.", price: 180 },
  googly: { name: "Глазки для игрушек", unit: "шт", price: 20 },
} satisfies Record<string, Template>;

export type PaperMaterialKey = keyof typeof templates;

export function mat(key: PaperMaterialKey, qty: number): Material {
  const t = templates[key];
  return { name: t.name, qty, unit: t.unit, price: t.price };
}

export const paperStock: StockItem[] = [
  { name: "Цветная бумага А4", stock: 40, unit: "лист" },
  { name: "Белая бумага А4", stock: 60, unit: "лист" },
  { name: "Цветной картон А4", stock: 15, unit: "лист" },
  { name: "Белый картон А4", stock: 12, unit: "лист" },
  { name: "Гофрированная бумага", stock: 5, unit: "рулон" },
  { name: "Картонная втулка", stock: 8, unit: "шт" },
  { name: "Клей-карандаш", stock: 2, unit: "шт" },
  { name: "Двусторонний скотч", stock: 2, unit: "рулон" },
  { name: "Фломастеры (набор)", stock: 1, unit: "набор" },
  { name: "Лента атласная", stock: 5, unit: "м" },
  { name: "Шпагат джутовый", stock: 30, unit: "м" },
  { name: "Бусины деревянные", stock: 30, unit: "шт" },
  { name: "Пуговицы", stock: 20, unit: "шт" },
  { name: "Магниты плоские", stock: 8, unit: "шт" },
  { name: "Салфетки бумажные", stock: 100, unit: "шт" },
  { name: "Старые журналы", stock: 6, unit: "шт" },
  { name: "Канцелярские кнопки", stock: 50, unit: "шт" },
  { name: "Скрепки канцелярские", stock: 100, unit: "шт" },
];
