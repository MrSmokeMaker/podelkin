import {
  crafts as craftData,
  inventory as inventoryData,
  type Craft,
  type StockItem,
} from "@/data/mockData";

/* Слой данных в памяти: заменяет PostgreSQL + Prisma в среде без сети
   и без возможности ставить пакеты. Мутации живут в рамках процесса сервера. */

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

export const crafts: Craft[] = craftData;

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

export const inventory: InventoryRecord[] = inventoryData.map((item, i) => ({
  id: `inv-${String(i + 1).padStart(2, "0")}`,
  ...item,
}));

export const synonyms: Synonym[] = [
  { id: "syn-01", query: "фетр", target: "шерсть" },
  { id: "syn-02", query: "плетение", target: "макраме" },
  { id: "syn-03", query: "пэчворк", target: "лоскут" },
  { id: "syn-04", query: "вязаная игрушка", target: "амигуруми" },
  { id: "syn-05", query: "свечка", target: "свеча" },
  { id: "syn-06", query: "пирография", target: "выжигание" },
];

export const boards: Board[] = [
  {
    id: "board-01",
    title: "Для кухни",
    craftSlugs: ["doska-s-vyzhiganiem", "loskutnaya-prihvatka", "soevaya-svecha"],
  },
  {
    id: "board-02",
    title: "Уют в гостиной",
    craftSlugs: ["panno-makrame", "bumazhnyy-svetilnik", "keramicheskaya-kruzhka"],
  },
  {
    id: "board-03",
    title: "Подарки",
    craftSlugs: [
      "sergi-iz-epoksidnoy-smoly",
      "mylo-s-nulya",
      "valyanaya-brosh-lichenok",
      "amigurumi-kotenok",
    ],
  },
  {
    id: "board-04",
    title: "Детская",
    craftSlugs: ["amigurumi-kotenok", "vaza-iz-pape-mashe", "snud-kruchkom"],
  },
  {
    id: "board-05",
    title: "Дача и сад",
    craftSlugs: ["eko-sumka-iz-dzhinsov", "vaza-iz-pape-mashe", "bumazhnyy-svetilnik"],
  },
];

function seedProjects(): Project[] {
  const build = (
    id: string,
    slug: string,
    doneUntil: number,
    startedAt: string
  ): Project | null => {
    const craft = craftData.find((c) => c.slug === slug);
    if (!craft) return null;
    return {
      id,
      craftSlug: craft.slug,
      craftTitle: craft.title,
      status: doneUntil >= craft.steps.length ? "готов" : "в работе",
      startedAt,
      updatedAt: startedAt,
      steps: craft.steps.map((step, i) => ({
        index: i,
        done: i < doneUntil,
        minutesSpent: i < doneUntil ? step.minutes : 0,
      })),
    };
  };

  return [
    build("prj-01", "panno-makrame", 5, "2025-11-08T10:00:00.000Z"),
    build("prj-02", "soevaya-svecha", 5, "2025-11-14T15:30:00.000Z"),
    build("prj-03", "derevyannaya-lozhka", 3, "2025-11-18T12:00:00.000Z"),
  ].filter((p): p is Project => p !== null);
}

export const projects: Project[] = seedProjects();

export function findProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function createProject(craft: Craft): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: `prj-${Date.now().toString(36)}`,
    craftSlug: craft.slug,
    craftTitle: craft.title,
    status: "в работе",
    startedAt: now,
    updatedAt: now,
    steps: craft.steps.map((_, i) => ({ index: i, done: false, minutesSpent: 0 })),
  };
  projects.push(project);
  return project;
}

export function upsertInventoryItem(
  name: string,
  stock: number,
  unit: string
): InventoryRecord {
  const existing = inventory.find((i) => i.name === name);
  if (existing) {
    existing.stock = stock;
    existing.unit = unit;
    return existing;
  }
  const record: InventoryRecord = {
    id: `inv-${Date.now().toString(36)}`,
    name,
    stock,
    unit,
  };
  inventory.push(record);
  return record;
}

export function deleteInventoryItem(id: string): boolean {
  const index = inventory.findIndex((i) => i.id === id);
  if (index === -1) return false;
  inventory.splice(index, 1);
  return true;
}
