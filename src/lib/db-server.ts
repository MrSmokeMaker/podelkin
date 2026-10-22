/* Слой данных в памяти: работает в любой среде, включая Vercel Serverless.
   Не требует внешней базы данных, работает стабильно и быстро. */

import {
  crafts as craftData,
  inventory as inventoryData,
  type Craft,
  type StockItem,
  type Category,
  type Difficulty,
  type Material,
  type Step,
} from "@/data/mockData";

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

export interface AiCraftFields {
  imagePrompt?: string;
  imageSeed?: number;
  source: "manual" | "ai";
  assetId?: string;
}

export type AiCraft = Craft & AiCraftFields;

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

export class P2002UniqueViolation extends Error {
  constructor(field: string) {
    super(`Unique violation on ${field}`);
    this.name = "P2002UniqueViolation";
  }
}

// In-Memory state
const memoryCrafts: AiCraft[] = craftData.map((craft) => ({
  ...craft,
  source: "manual" as const,
}));

export const aiCrafts: AiCraftRecord[] = [];
export const aiDrafts: AiDraft[] = [];
export const memoryInventory: InventoryRecord[] = inventoryData.map((item, i) => ({
  id: `inv-${String(i + 1).padStart(2, "0")}`,
  ...item,
}));

export const memoryProjects: Project[] = [
  {
    id: "proj-01",
    craftSlug: "keramicheskaya-kruzhka",
    craftTitle: "Керамическая кружка ручной лепки",
    status: "в работе",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      { index: 0, done: true, minutesSpent: 25 },
      { index: 1, done: true, minutesSpent: 15 },
      { index: 2, done: false, minutesSpent: 0 },
    ],
  },
];

export const memoryBoards: Board[] = [
  {
    id: "board-01",
    title: "Идеи на выходные",
    craftSlugs: ["keramicheskaya-kruzhka", "derevyannaya-lozhka"],
  },
  {
    id: "board-02",
    title: "Подарки своими руками",
    craftSlugs: ["panno-makrame", "aromaticheskaya-svecha"],
  },
];

export const memoryImageAssets: ImageAsset[] = [];
let draftSeq = 0;
const generationLog: { userId: string; day: string }[] = [];

/* ===== Методы API слоя данных ===== */

export async function listCrafts(): Promise<AiCraft[]> {
  const custom = aiCrafts.map((c) => ({
    slug: c.slug,
    title: c.title,
    description: c.description,
    category: c.category as Category,
    difficulty: c.difficulty as Difficulty,
    image: c.imageUrl ?? undefined,
    materials: c.materials as unknown as Material[],
    tools: c.tools,
    steps: c.steps.map((s) => ({ title: s.title, description: s.description, minutes: s.minutes })),
    safetyNotes: c.safetyNotes,
    source: "ai" as const,
    imagePrompt: c.imagePrompt,
    imageSeed: c.imageSeed,
    assetId: c.assetId,
  }));
  return [...custom, ...memoryCrafts];
}

export async function listAiCrafts(): Promise<AiCraftRecord[]> {
  return [...aiCrafts];
}

export async function listInventory(): Promise<InventoryRecord[]> {
  return [...memoryInventory];
}

export async function upsertInventoryItem(name: string, stock: number, unit: string): Promise<InventoryRecord> {
  const existing = memoryInventory.find((i) => i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.stock = stock;
    existing.unit = unit;
    return existing;
  }
  const item: InventoryRecord = {
    id: `inv-${Date.now().toString(36)}`,
    name,
    stock,
    unit,
  };
  memoryInventory.push(item);
  return item;
}

export async function deleteInventoryItem(id: string): Promise<boolean> {
  const idx = memoryInventory.findIndex((i) => i.id === id);
  if (idx !== -1) {
    memoryInventory.splice(idx, 1);
    return true;
  }
  return false;
}

export async function listProjects(): Promise<Project[]> {
  return [...memoryProjects];
}

export async function findProject(id: string): Promise<Project | null> {
  return memoryProjects.find((p) => p.id === id) ?? null;
}

export async function createProject(craft: Craft): Promise<Project> {
  const p: Project = {
    id: `proj-${Date.now().toString(36)}`,
    craftSlug: craft.slug,
    craftTitle: craft.title,
    status: "в работе",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: craft.steps.map((_, i) => ({
      index: i,
      done: false,
      minutesSpent: 0,
    })),
  };
  memoryProjects.unshift(p);
  return p;
}

export async function saveProject(project: Project): Promise<void> {
  const idx = memoryProjects.findIndex((p) => p.id === project.id);
  if (idx !== -1) {
    memoryProjects[idx] = { ...project, updatedAt: new Date().toISOString() };
  }
}

export async function listBoards(): Promise<Board[]> {
  return [...memoryBoards];
}

export async function createBoard(title: string, craftSlugs: string[] = []): Promise<Board> {
  const b: Board = {
    id: `board-${Date.now().toString(36)}`,
    title,
    craftSlugs,
  };
  memoryBoards.push(b);
  return b;
}

export async function saveBoard(board: Board): Promise<void> {
  const idx = memoryBoards.findIndex((b) => b.id === board.id);
  if (idx !== -1) {
    memoryBoards[idx] = board;
  }
}

export async function deleteBoard(id: string): Promise<boolean> {
  const idx = memoryBoards.findIndex((b) => b.id === id);
  if (idx !== -1) {
    memoryBoards.splice(idx, 1);
    return true;
  }
  return false;
}

export async function createAiDraft(input: {
  topic: string;
  normalizedTopic: string;
  payload: unknown;
  valid: boolean;
}): Promise<AiDraft> {
  const draft: AiDraft = {
    id: `aid-${Date.now().toString(36)}-${++draftSeq}`,
    topic: input.topic,
    normalizedTopic: input.normalizedTopic,
    payload: input.payload,
    valid: input.valid,
    status: "draft",
    createdAt: new Date().toISOString(),
    craftId: null,
  };
  aiDrafts.unshift(draft);
  return draft;
}

export async function findAiDraft(id: string): Promise<AiDraft | null> {
  return aiDrafts.find((d) => d.id === id) ?? null;
}

export async function findCachedAiDraft(normalizedTopic: string, withinMs: number): Promise<AiDraft | null> {
  const threshold = Date.now() - withinMs;
  return (
    aiDrafts.find(
      (d) =>
        d.normalizedTopic === normalizedTopic &&
        d.valid &&
        Date.parse(d.createdAt) >= threshold
    ) ?? null
  );
}

export async function markAiDraftApproved(id: string, craftId: string): Promise<void> {
  const draft = aiDrafts.find((d) => d.id === id);
  if (draft) {
    draft.status = "approved";
    draft.craftId = craftId;
  }
}

export async function countGenerationsToday(userId: string): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
  return generationLog.filter((g) => g.userId === userId && g.day === day).length;
}

export async function registerGeneration(userId: string): Promise<void> {
  generationLog.push({ userId, day: new Date().toISOString().slice(0, 10) });
}

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
  const uniqueSlug = aiCrafts.some((c) => c.slug === slug)
    ? `${slug}-${Date.now().toString(36).slice(-4)}`
    : slug;
  const craft: AiCraftRecord = {
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
    createdAt: new Date().toISOString(),
  };
  aiCrafts.unshift(craft);
  return craft;
}

export async function findAiCraft(id: string): Promise<AiCraftRecord | undefined> {
  return aiCrafts.find((c) => c.id === id);
}

export async function attachImageToCraft(
  craftId: string,
  image: { imageSeed: number; assetId: string; imageUrl: string }
): Promise<void> {
  const craft = aiCrafts.find((c) => c.id === craftId);
  if (craft) {
    craft.imageSeed = image.imageSeed;
    craft.assetId = image.assetId;
    craft.imageUrl = image.imageUrl;
  }
}

export const imageAssetStore = {
  async findByHash(promptHash: string): Promise<ImageAsset | null> {
    return memoryImageAssets.find((a) => a.promptHash === promptHash) ?? null;
  },
  async create(input: {
    promptHash: string;
    prompt: string;
    provider: string;
    seed: number;
  }): Promise<ImageAsset> {
    const existing = memoryImageAssets.find((a) => a.promptHash === input.promptHash);
    if (existing) {
      throw new P2002UniqueViolation("ImageAsset.promptHash");
    }
    const asset: ImageAsset = {
      id: `img-${Date.now().toString(36)}`,
      promptHash: input.promptHash,
      prompt: input.prompt,
      provider: input.provider,
      fileUrl: null,
      seed: input.seed,
      width: 1024,
      height: 1024,
      steps: 4,
      hits: 0,
      createdAt: new Date().toISOString(),
    };
    memoryImageAssets.unshift(asset);
    return asset;
  },
  async attachFileUrl(id: string, fileUrl: string): Promise<void> {
    const asset = memoryImageAssets.find((a) => a.id === id);
    if (asset) asset.fileUrl = fileUrl;
  },
  async bumpHits(id: string): Promise<void> {
    const asset = memoryImageAssets.find((a) => a.id === id);
    if (asset) asset.hits += 1;
  },
};

export const memoryAiStats = {
  llmCalls: 0,
  imageRenders: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

export async function bumpAiStat(key: keyof typeof memoryAiStats): Promise<number> {
  memoryAiStats[key] += 1;
  return memoryAiStats[key];
}

export async function getAiStats(): Promise<typeof memoryAiStats> {
  return { ...memoryAiStats };
}
