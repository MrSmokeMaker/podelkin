/* Готовая замена src/lib/db.ts при переходе на PostgreSQL + Prisma.
   Этот файл — клиентобезопасная часть: типы и справочные данные
   (прайс-бук, синонимы). Никаких импортов Prisma — его можно тянуть
   и в клиентские компоненты, как прежний db.ts.
   Все функции работы с базой — в src/lib/db-server.ts (шаблон:
   prisma/db-server.postgres.ts). */

import type { Craft, StockItem } from "@/data/mockData";

export interface PriceBookItem {
  id: string;
  name: string;
  baseUnit: string;
  price: number;
  updatedAt: string;
}

export interface InventoryRecord extends StockItem {
  id: string;
}

export interface Synonym {
  id: string;
  query: string;
  target: string;
}

export interface ProjectStep {
  index: number;
  done: boolean;
  minutesSpent: number;
}

export interface Project {
  id: string;
  craftSlug: string;
  craftTitle: string;
  status: "в работе" | "готов";
  startedAt: string;
  updatedAt: string;
  steps: ProjectStep[];
}

export interface Board {
  id: string;
  title: string;
  craftSlugs: string[];
}

/* Поля Craft из миграции ai_generation. */
export interface AiCraftFields {
  imagePrompt?: string;
  imageSeed?: number;
  source: "manual" | "ai";
  assetId?: string;
}

export type AiCraft = Craft & AiCraftFields;

export interface ImageAsset {
  id: string;
  promptHash: string;
  prompt: string;
  provider: string;
  fileUrl: string | null;
  seed: number;
  width: number;
  height: number;
  steps: number;
  hits: number;
  createdAt: string;
}

export interface AiDraft {
  id: string;
  topic: string;
  normalizedTopic: string;
  payload: unknown;
  valid: boolean;
  status: "draft" | "approved" | "rejected";
  createdAt: string;
  craftId: string | null;
}

export interface AiCraftRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Легко" | "Средне" | "Сложно";
  estimatedTimeMin: number;
  materials: { name: string; qty: number; unit: string; optional?: boolean }[];
  tools: string[];
  steps: { title: string; description: string; minutes: number }[];
  safetyNotes: string[];
  tags: string[];
  source: "ai";
  imagePrompt?: string;
  imageSeed?: number;
  assetId?: string;
  imageUrl?: string | null;
  createdAt: string;
}

/* Ошибка уникальности в формате кода Prisma (P2002): обработчики
   catch с проверкой .code === "P2002" работают без изменений. */
export class P2002UniqueViolation extends Error {
  code = "P2002";

  constructor(target: string) {
    super(`Unique constraint failed on ${target}`);
    this.name = "P2002UniqueViolation";
  }
}

/* ===== Справочные данные: живут в коде, в базу не переезжают ===== */

const PRICE_DATE = "2025-11-20";

let priceId = 0;
const price = (name: string, baseUnit: string, pricePerBase: number): PriceBookItem => ({
  id: `price-${String(++priceId).padStart(2, "0")}`,
  name,
  baseUnit,
  price: pricePerBase,
  updatedAt: PRICE_DATE,
});

export const priceBook: PriceBookItem[] = [
  price("Глина красная", "кг", 260),
  price("Глазурь прозрачная", "кг", 450),
  price("Шликер для сцепки", "л", 450),
  price("Липовая заготовка 250×80×25 мм", "шт", 180),
  price("Льняное масло", "л", 800),
  price("Ветошь", "шт", 10),
  price("Наждачная бумага (набор)", "набор", 120),
  price("Хлопковый шнур 3 мм", "м", 12),
  price("Деревянная планка 40 см", "шт", 90),
  price("Соевый воск", "кг", 1200),
  price("Фитиль хлопковый №8", "шт", 25),
  price("Аромамасло лаванды", "л", 8000),
  price("Жаропрочный стакан", "шт", 150),
  price("Пряжа акрил 50 г", "мотка", 160),
  price("Льняная ткань 30×30 см", "отрез", 120),
  price("Мулине (6 цветов)", "шт", 35),
  price("Ватман А3", "лист", 45),
  price("LED-гирлянда на батарейках", "шт", 350),
  price("Клей ПВА", "л", 3000),
  price("Газеты", "лист", 2),
  price("Воздушный шар", "шт", 15),
  price("Акриловая краска", "бан.", 180),
  price("Старые джинсы", "шт", 0),
  price("Нитки армированные", "катушка", 90),
  price("Эпоксидная смола", "кг", 2500),
  price("Силиконовая форма для серёг", "шт", 220),
  price("Краситель для смолы", "л", 60000),
  price("Швензы", "шт", 40),
  price("Оливковое масло", "кг", 500),
  price("Кокосовое масло", "кг", 800),
  price("Гидроксид натрия", "кг", 600),
  price("Эфирное масло чайного дерева", "л", 9000),
  price("Силиконовая форма для мыла", "шт", 250),
  price("Шерсть меринос, оранжевая", "кг", 4000),
  price("Шерсть меринос, белая", "кг", 4000),
  price("Булавка-застёжка", "шт", 30),
  price("Бусины чёрные", "шт", 5),
  price("Текстильный клей", "л", 6000),
  price("Наполнитель холлофайбер", "кг", 1500),
  price("Глазки для игрушек", "шт", 20),
  price("Синтепон 30×30 см", "отрез", 80),
];

export const synonyms: Synonym[] = [
  { id: "syn-01", query: "фетр", target: "шерсть" },
  { id: "syn-02", query: "плетение", target: "макраме" },
  { id: "syn-03", query: "пэчворк", target: "лоскут" },
  { id: "syn-04", query: "вязаная игрушка", target: "амигуруми" },
  { id: "syn-05", query: "свечка", target: "свеча" },
  { id: "syn-06", query: "пирография", target: "выжигание" },
];
