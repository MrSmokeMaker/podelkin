/* Наполнение базы стартовыми данными Podelkin.
   Запуск: bunx prisma db seed (в package.json прописан "prisma.seed").

   Что кладём:
   • поделки из src/data/mockData (source: "manual") — upsert по slug,
     поэтому сгенерированные ИИ поделки при повторном сиде не трогаются;
   • стартовые запасы, демо-доски, демо-проекты, раздел «Поделки» —
     пересоздаются (deleteMany + createMany). */

import { PrismaClient } from "@prisma/client";
import { crafts as craftData, inventory as inventoryData } from "../src/data/mockData";

const prisma = new PrismaClient();

interface BoardSeed {
  title: string;
  craftSlugs: string[];
}

const boardSeeds: BoardSeed[] = [
  {
    title: "Для кухни",
    craftSlugs: ["doska-s-vyzhiganiem", "loskutnaya-prihvatka", "soevaya-svecha"],
  },
  {
    title: "Уют в гостиной",
    craftSlugs: ["panno-makrame", "bumazhnyy-svetilnik", "keramicheskaya-kruzhka"],
  },
  {
    title: "Подарки",
    craftSlugs: [
      "sergi-iz-epoksidnoy-smoly",
      "mylo-s-nulya",
      "valyanaya-brosh-lichenok",
      "amigurumi-kotenok",
    ],
  },
  {
    title: "Детская",
    craftSlugs: ["amigurumi-kotenok", "vaza-iz-pape-mashe", "snud-kruchkom"],
  },
  {
    title: "Дача и сад",
    craftSlugs: ["eko-sumka-iz-dzhinsov", "vaza-iz-pape-mashe", "bumazhnyy-svetilnik"],
  },
];

interface ProjectSeed {
  slug: string;
  doneUntil: number;
  startedAt: Date;
}

const projectSeeds: ProjectSeed[] = [
  { slug: "panno-makrame", doneUntil: 5, startedAt: new Date("2025-11-08T10:00:00.000Z") },
  { slug: "soevaya-svecha", doneUntil: 5, startedAt: new Date("2025-11-14T15:30:00.000Z") },
  { slug: "derevyannaya-lozhka", doneUntil: 3, startedAt: new Date("2025-11-18T12:00:00.000Z") },
];

interface CatalogSeed {
  title: string;
  category: string;
  sourceUrl: string;
  sourceName: string;
  description: string;
  difficulty: string;
  materials: string[];
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: string[];
  createdAt: Date;
}

const catalogSeeds: CatalogSeed[] = [
  {
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
    createdAt: new Date("2025-11-10T09:00:00.000Z"),
  },
  {
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
    createdAt: new Date("2025-11-14T12:30:00.000Z"),
  },
  {
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
    createdAt: new Date("2025-11-18T15:00:00.000Z"),
  },
  {
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
    createdAt: new Date("2025-11-20T10:45:00.000Z"),
  },
];

async function seedCrafts() {
  for (const craft of craftData) {
    const data = {
      slug: craft.slug,
      title: craft.title,
      description: craft.description,
      category: craft.category,
      difficulty: craft.difficulty,
      image: craft.image ?? null,
      materials: craft.materials,
      tools: craft.tools,
      steps: craft.steps,
      safetyNotes: craft.safetyNotes,
      source: "manual",
    };
    await prisma.craft.upsert({
      where: { slug: craft.slug },
      update: data,
      create: data,
    });
  }
}

async function seedInventory() {
  await prisma.inventoryItem.deleteMany();
  await prisma.inventoryItem.createMany({
    data: inventoryData.map((item) => ({
      name: item.name,
      stock: item.stock,
      unit: item.unit,
    })),
  });
}

async function seedBoards() {
  await prisma.board.deleteMany();
  await prisma.board.createMany({
    data: boardSeeds.map((board) => ({
      title: board.title,
      craftSlugs: board.craftSlugs,
    })),
  });
}

async function seedProjects() {
  await prisma.project.deleteMany();
  for (const seed of projectSeeds) {
    const craft = craftData.find((c) => c.slug === seed.slug);
    if (!craft) continue;
    await prisma.project.create({
      data: {
        craftSlug: craft.slug,
        craftTitle: craft.title,
        status: seed.doneUntil >= craft.steps.length ? "готов" : "в работе",
        startedAt: seed.startedAt,
        updatedAt: seed.startedAt,
        steps: craft.steps.map((_, i) => ({
          index: i,
          done: i < seed.doneUntil,
          minutesSpent: i < seed.doneUntil ? craft.steps[i].minutes : 0,
        })),
      },
    });
  }
}

async function seedCatalog() {
  await prisma.catalogItem.deleteMany();
  await prisma.catalogItem.createMany({
    data: catalogSeeds.map((item) => ({ ...item })),
  });
}

async function main() {
  await seedCrafts();
  await seedInventory();
  await seedBoards();
  await seedProjects();
  await seedCatalog();
  console.log("Сид выполнен:");
  console.log(`  • поделки (manual): ${craftData.length}`);
  console.log(`  • запасы: ${inventoryData.length}`);
  console.log(`  • доски: ${boardSeeds.length}`);
  console.log(`  • проекты: ${projectSeeds.length}`);
  console.log(`  • каталог «Поделки»: ${catalogSeeds.length}`);
}

main()
  .catch((error) => {
    console.error("Ошибка сида:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
