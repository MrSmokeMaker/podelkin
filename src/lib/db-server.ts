/* Готовая замена серверной части слоя данных (шаблон для src/lib/db-server.ts).
   Содержит все функции бывшего src/lib/db.ts, которые работали с изменяемым
   состоянием, — теперь поверх PostgreSQL + Prisma. Контракт сохранён:
   те же имена и аргументы, но функции асинхронные — в маршрутах допишите await.

   Ссылочные данные (priceBook, synonyms) и типы остаются в src/lib/db.ts —
   collectCost и поиск по синонимам продолжают работать синхронно.

   Соответствие старых экспортов:
     crafts / aiCrafts          → listCrafts() / listAiCrafts()
     inventory                  → listInventory()
     boards                     → listBoards()      (создание: createBoard)
     projects                   → listProjects()    (мутации: saveProject)
     imageAssets                → imageAssetStore.* (API прежний)
     aiStats.llmCalls++ и т.п.  → await bumpAiStat("llmCalls")
     прямые мутации project.*   → await saveProject(project) */

import { Prisma, PrismaClient } from "@prisma/client";
import type {
  Category,
  Craft,
  Difficulty,
  Material,
  Step,
} from "@/data/mockData";
import type {
  AiCraft,
  AiCraftRecord,
  AiDraft,
  Board,
  ImageAsset,
  InventoryRecord,
  Project,
} from "@/lib/db";
import { P2002UniqueViolation } from "@/lib/db";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/* ===== Мапперы: строки БД → прежние TypeScript-интерфейсы ===== */

interface CraftRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  image: string | null;
  materials: Prisma.JsonValue;
  tools: Prisma.JsonValue;
  steps: Prisma.JsonValue;
  safetyNotes: Prisma.JsonValue;
  tags: Prisma.JsonValue | null;
  source: string;
  estimatedTimeMin: number | null;
  imagePrompt: string | null;
  imageSeed: number | null;
  assetId: string | null;
  imageUrl: string | null;
  createdAt: Date;
}

function toAiCraft(row: CraftRow): AiCraft {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category as Category,
    difficulty: row.difficulty as Difficulty,
    image: row.image ?? undefined,
    materials: row.materials as unknown as Material[],
    tools: row.tools as unknown as string[],
    steps: row.steps as unknown as Step[],
    safetyNotes: row.safetyNotes as unknown as string[],
    source: row.source as "manual" | "ai",
    imagePrompt: row.imagePrompt ?? undefined,
    imageSeed: row.imageSeed ?? undefined,
    assetId: row.assetId ?? undefined,
  };
}

function toAiCraftRecord(row: CraftRow): AiCraftRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty as AiCraftRecord["difficulty"],
    estimatedTimeMin: row.estimatedTimeMin ?? 0,
    materials: row.materials as unknown as AiCraftRecord["materials"],
    tools: row.tools as unknown as string[],
    steps: row.steps as unknown as AiCraftRecord["steps"],
    safetyNotes: row.safetyNotes as unknown as string[],
    tags: (row.tags as unknown as string[]) ?? [],
    source: "ai",
    imagePrompt: row.imagePrompt ?? undefined,
    imageSeed: row.imageSeed ?? undefined,
    assetId: row.assetId ?? undefined,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

function toImageAsset(row: {
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
  createdAt: Date;
}): ImageAsset {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function toAiDraft(row: {
  id: string;
  topic: string;
  normalizedTopic: string;
  payload: Prisma.JsonValue;
  valid: boolean;
  status: string;
  createdAt: Date;
  craftId: string | null;
}): AiDraft {
  return {
    id: row.id,
    topic: row.topic,
    normalizedTopic: row.normalizedTopic,
    payload: row.payload as unknown,
    valid: row.valid,
    status: row.status as AiDraft["status"],
    createdAt: row.createdAt.toISOString(),
    craftId: row.craftId,
  };
}

function toProject(row: {
  id: string;
  craftSlug: string;
  craftTitle: string;
  status: string;
  startedAt: Date;
  updatedAt: Date;
  steps: Prisma.JsonValue;
}): Project {
  return {
    id: row.id,
    craftSlug: row.craftSlug,
    craftTitle: row.craftTitle,
    status: row.status as Project["status"],
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    steps: row.steps as unknown as Project["steps"],
  };
}

function toBoard(row: {
  id: string;
  title: string;
  craftSlugs: Prisma.JsonValue;
}): Board {
  return {
    id: row.id,
    title: row.title,
    craftSlugs: row.craftSlugs as unknown as string[],
  };
}

/* ===== Поделки ===== */

export async function listCrafts(): Promise<AiCraft[]> {
  const rows = await prisma.craft.findMany({
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
  });
  return rows.map(toAiCraft);
}

export async function listAiCrafts(): Promise<AiCraftRecord[]> {
  const rows = await prisma.craft.findMany({
    where: { source: "ai" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAiCraftRecord);
}

/* ===== Черновик → поделка: запись создаётся только через approve ===== */

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `ai-${Date.now().toString(36)}`;
}

export async function createAiCraft(payload: {
  title: string;
  summary: string;
  category: string;
  difficulty: "Легко" | "Средне" | "Сложно";
  estimatedTimeMin: number;
  steps: { n: number; text: string; minutes: number }[];
  materials: { name: string; qty: number; unit: string; optional: boolean }[];
  tools: string[];
  tags: string[];
  safetyNotes: string | null;
  imagePrompt: string;
}): Promise<AiCraftRecord> {
  const slug = slugify(payload.title);
  const existing = await prisma.craft.findUnique({ where: { slug } });
  const uniqueSlug = existing
    ? `${slug}-${Date.now().toString(36).slice(-4)}`
    : slug;
  const row = await prisma.craft.create({
    data: {
      id: `craft-ai-${Date.now().toString(36)}`,
      slug: uniqueSlug,
      title: payload.title,
      description: payload.summary,
      category: payload.category,
      difficulty: payload.difficulty,
      estimatedTimeMin: payload.estimatedTimeMin,
      materials: payload.materials.map(({ name, qty, unit, optional }) => ({
        name,
        qty,
        unit,
        optional,
      })),
      tools: payload.tools,
      steps: payload.steps.map((s) => ({
        title: `Шаг ${s.n}`,
        description: s.text,
        minutes: s.minutes,
      })),
      safetyNotes: payload.safetyNotes ? [payload.safetyNotes] : [],
      tags: payload.tags,
      source: "ai",
      imagePrompt: payload.imagePrompt,
    },
  });
  return toAiCraftRecord(row);
}

export async function findAiCraft(id: string): Promise<AiCraftRecord | undefined> {
  const row = await prisma.craft.findUnique({ where: { id } });
  return row && row.source === "ai" ? toAiCraftRecord(row) : undefined;
}

export async function attachImageToCraft(
  craftId: string,
  image: { imageSeed: number; assetId: string; imageUrl: string }
): Promise<void> {
  await prisma.craft.updateMany({
    where: { id: craftId, source: "ai" },
    data: {
      imageSeed: image.imageSeed,
      assetId: image.assetId,
      imageUrl: image.imageUrl,
    },
  });
}

/* ===== Запасы ===== */

export async function listInventory(): Promise<InventoryRecord[]> {
  return prisma.inventoryItem.findMany({ orderBy: { name: "asc" } });
}

export async function upsertInventoryItem(
  name: string,
  stock: number,
  unit: string
): Promise<InventoryRecord> {
  return prisma.inventoryItem.upsert({
    where: { name },
    create: { name, stock, unit },
    update: { stock, unit },
  });
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const result = await prisma.inventoryItem.deleteMany({ where: { id } });
  return result.count > 0;
}

/* ===== Проекты ===== */

export async function listProjects(): Promise<Project[]> {
  const rows = await prisma.project.findMany({ orderBy: { startedAt: "desc" } });
  return rows.map(toProject);
}

export async function findProject(id: string): Promise<Project | null> {
  const row = await prisma.project.findUnique({ where: { id } });
  return row ? toProject(row) : null;
}

export async function createProject(craft: Craft): Promise<Project> {
  const row = await prisma.project.create({
    data: {
      craftSlug: craft.slug,
      craftTitle: craft.title,
      status: "в работе",
      steps: craft.steps.map((_, i) => ({
        index: i,
        done: false,
        minutesSpent: 0,
      })),
    },
  });
  return toProject(row);
}

/* Прежний код мутировал объект проекта напрямую — теперь сохраняйте
   состояние явно: p.steps[i].done = true; await saveProject(p); */
export async function saveProject(project: Project): Promise<void> {
  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: project.status,
      steps: project.steps as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}

/* ===== Доски ===== */

export async function listBoards(): Promise<Board[]> {
  const rows = await prisma.board.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toBoard);
}

export async function createBoard(
  title: string,
  craftSlugs: string[]
): Promise<Board> {
  const row = await prisma.board.create({
    data: { title, craftSlugs },
  });
  return toBoard(row);
}

export async function saveBoard(board: Board): Promise<void> {
  await prisma.board.update({
    where: { id: board.id },
    data: { title: board.title, craftSlugs: board.craftSlugs },
  });
}

export async function deleteBoard(id: string): Promise<boolean> {
  const result = await prisma.board.deleteMany({ where: { id } });
  return result.count > 0;
}

/* ===== Кэш картинок (API прежнего imageAssetStore сохранён) ===== */

export const imageAssetStore = {
  async findByHash(promptHash: string): Promise<ImageAsset | null> {
    const row = await prisma.imageAsset.findUnique({ where: { promptHash } });
    return row ? toImageAsset(row) : null;
  },

  async create(input: {
    promptHash: string;
    prompt: string;
    provider: string;
    seed: number;
  }): Promise<ImageAsset> {
    const existing = await prisma.imageAsset.findUnique({
      where: { promptHash: input.promptHash },
    });
    if (existing) {
      throw new P2002UniqueViolation("ImageAsset.promptHash");
    }
    const row = await prisma.imageAsset.create({
      data: {
        promptHash: input.promptHash,
        prompt: input.prompt,
        provider: input.provider,
        seed: input.seed,
        steps: Number(process.env.CF_STEPS) || 4,
      },
    });
    return toImageAsset(row);
  },

  createUniqueViolation(): Error {
    return new P2002UniqueViolation("ImageAsset.promptHash");
  },

  async incrementHits(id: string): Promise<void> {
    await prisma.imageAsset.updateMany({
      where: { id },
      data: { hits: { increment: 1 } },
    });
  },

  async updateFileUrl(id: string, fileUrl: string): Promise<void> {
    await prisma.imageAsset.updateMany({ where: { id }, data: { fileUrl } });
  },

  async remove(id: string): Promise<void> {
    await prisma.imageAsset.deleteMany({ where: { id } });
  },
};

/* ===== Черновики ИИ ===== */

export async function createAiDraft(input: {
  topic: string;
  normalizedTopic: string;
  payload: unknown;
  valid: boolean;
}): Promise<AiDraft> {
  const row = await prisma.aiDraft.create({
    data: {
      topic: input.topic,
      normalizedTopic: input.normalizedTopic,
      payload: input.payload as Prisma.InputJsonValue,
      valid: input.valid,
    },
  });
  return toAiDraft(row);
}

export async function findAiDraft(id: string): Promise<AiDraft | undefined> {
  const row = await prisma.aiDraft.findUnique({ where: { id } });
  return row ? toAiDraft(row) : undefined;
}

export async function findCachedAiDraft(
  normalizedTopic: string,
  withinMs: number
): Promise<AiDraft | null> {
  const row = await prisma.aiDraft.findFirst({
    where: {
      normalizedTopic,
      valid: true,
      createdAt: { gte: new Date(Date.now() - withinMs) },
    },
    orderBy: { createdAt: "desc" },
  });
  return row ? toAiDraft(row) : null;
}


export async function findCraftBySlug(slug: string): Promise<AiCraft | undefined> {
  const row = await prisma.craft.findUnique({ where: { slug } });
  return row ? toAiCraft(row) : undefined;
}
export async function markAiDraftApproved(
  id: string,
  craftId: string
): Promise<void> {
  await prisma.aiDraft.updateMany({
    where: { id },
    data: { status: "approved", craftId },
  });
}

/* ===== Счётчики для /api/stats/ai (прежний объект aiStats) ===== */

export type AiStatKey = "llmCalls" | "imageRenders" | "cacheHits" | "cacheMisses";

export async function getAiStats(): Promise<Record<AiStatKey, number>> {
  const stats: Record<AiStatKey, number> = {
    llmCalls: 0,
    imageRenders: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  const rows = await prisma.aiStats.findMany();
  for (const row of rows) {
    if (row.key in stats) stats[row.key as AiStatKey] = row.value;
  }
  return stats;
}

export async function bumpAiStat(key: AiStatKey, by = 1): Promise<void> {
  await prisma.aiStats.upsert({
    where: { key },
    create: { key, value: by },
    update: { value: { increment: by } },
  });
}

/* ===== Дневной лимит генераций (GEN_PER_USER_PER_DAY) ===== */

export async function countGenerationsToday(userId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  const row = await prisma.generationCounter.findUnique({
    where: { userId_day: { userId, day } },
  });
  return row?.count ?? 0;
}

export async function registerGeneration(userId: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await prisma.generationCounter.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });
}
