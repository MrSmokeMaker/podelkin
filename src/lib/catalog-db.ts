/* Раздел «Каталог поделок»: модели с only-paper.ru и 1001zagotovka.ru.
   Парсинга нет — контент добавляют вручную через форму. Хранилище в памяти,
   как и остальной слой данных (см. src/lib/db.ts). */

export const CATALOG_CATEGORIES = [
  "бумажная модель",
  "деревянная заготовка",
  "3D-открытка",
  "игрушка",
  "макет",
  "декор",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export const CATALOG_SOURCES = ["Only Paper", "1001 Заготовка"] as const;
export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export const CATALOG_DIFFICULTIES = ["легко", "средне", "сложно"] as const;
export type CatalogDifficulty = (typeof CATALOG_DIFFICULTIES)[number];

export interface CatalogItem {
  id: string;
  title: string;
  category: CatalogCategory;
  sourceUrl: string;
  sourceName: CatalogSource;
  description: string;
  difficulty: CatalogDifficulty;
  materials: string[];
  instructions?: string[];
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: string[];
  createdAt: string;
}

/* sourceName подставляется по домену sourceUrl. */
export function sourceNameFromUrl(url: string): CatalogSource | null {
  const lower = url.toLowerCase();
  if (lower.includes("only-paper.ru")) return "Only Paper";
  if (lower.includes("1001zagotovka.ru")) return "1001 Заготовка";
  return null;
}

export const catalogItems: CatalogItem[] = [
  {
    id: "pod-01",
    title: "Истребитель Supermarine Spitfire, масштаб 1:33",
    category: "бумажная модель",
    sourceUrl: "https://only-paper.ru/models/spitfire-mkvb",
    sourceName: "Only Paper",
    description:
      "Классическая картонная модель легендарного истребителя: развёртки на 12 листах, детализация кабины и шасси. Сборка на подставке, крылья съёмные для транспортировки.",
    difficulty: "средне",
    materials: ["бумага 200 г/м²", "клей ПВА", "канцелярский нож", "металлическая линейка", "зубочистки для роллов"],
    assemblyTime: "6 часов",
    thumbnail: "/podelki/spitfire.webp",
    templateUrl: "https://only-paper.ru/models/spitfire-mkvb/deploy.pdf",
    tags: ["авиация", "вторая мировая", "масштаб 1:33", "картон"],
    createdAt: "2025-11-10T09:00:00.000Z",
  },
  {
    id: "pod-02",
    title: "Заготовка «Матрёшка» под роспись, 15 см",
    category: "деревянная заготовка",
    sourceUrl: "https://1001zagotovka.ru/catalog/matrioshka-15",
    sourceName: "1001 Заготовка",
    description:
      "Фанерная матрёшка шлифованная, под роспись акрилом и декупаж. Контур лица нанесён лазером — остаётся раскрасить и покрыть лаком.",
    difficulty: "легко",
    materials: ["акриловая краска", "кисть плоская №6", "контур по дереву", "акриловый лак"],
    assemblyTime: "1 час",
    thumbnail: "/podelki/matryoshka.webp",
    templateUrl: "https://1001zagotovka.ru/catalog/matrioshka-15/scheme.pdf",
    tags: ["роспись", "декупаж", "подарок", "фанера"],
    createdAt: "2025-11-14T12:30:00.000Z",
  },
  {
    id: "pod-03",
    title: "3D-открытка «День и ночь»",
    category: "3D-открытка",
    sourceUrl: "https://only-paper.ru/cards/day-night",
    sourceName: "Only Paper",
    description:
      "Открытка-трансформер: при повороте колеса день меняется ночью, силуэты города двигаются за счёт кулисного механизма. Развёртка на одном листе А4.",
    difficulty: "легко",
    materials: ["бумага 160 г/м²", "клей-карандаш", "ножницы", "шило и бусина для оси"],
    assemblyTime: "40 мин",
    thumbnail: "/podelki/day-night.webp",
    templateUrl: "https://only-paper.ru/cards/day-night/deploy.pdf",
    tags: ["открытка", "механика", "подарок", "А4"],
    createdAt: "2025-11-18T15:00:00.000Z",
  },
  {
    id: "pod-04",
    title: "Макет ветряной мельницы с вращением крыльев",
    category: "макет",
    sourceUrl: "https://1001zagotovka.ru/catalog/melnitsa-3d",
    sourceName: "1001 Заготовка",
    description:
      "Набор деревянных деталей для настольной мельницы: крылья вращаются от встроенного моторчика на батарейках. Подходит для первого знакомства с моделями.",
    difficulty: "сложно",
    materials: ["фанерные детали набора", "деревянный клей", "наждачная бумага P220", "моторчик с редуктором", "акриловая краска"],
    assemblyTime: "2 дня",
    thumbnail: "/podelki/melnitsa.webp",
    templateUrl: "https://1001zagotovka.ru/catalog/melnitsa-3d/manual.pdf",
    tags: ["механика", "моторчик", "дача", "набор"],
    createdAt: "2025-11-20T10:45:00.000Z",
  },
];

let itemSeq = catalogItems.length;

export function findCatalogItem(id: string): CatalogItem | undefined {
  return catalogItems.find((item) => item.id === id);
}

export function createCatalogItem(input: {
  title: string;
  category: CatalogCategory;
  sourceUrl: string;
  description: string;
  difficulty: CatalogDifficulty;
  materials: string[];
  instructions?: string[];
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: string[];
}): CatalogItem {
  const item: CatalogItem = {
    id: `pod-${String(++itemSeq).padStart(2, "0")}`,
    sourceName: sourceNameFromUrl(input.sourceUrl) ?? "Only Paper",
    createdAt: new Date().toISOString(),
    ...input,
  };
  catalogItems.unshift(item);
  return item;
}
