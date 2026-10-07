import { createHash } from "node:crypto";
import { getImageProvider, resolveProviderName } from "./imageProvider";

const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 2_000;

export interface ImageAssetRow {
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

export interface ImageAssetStore {
  findByHash(promptHash: string): Promise<ImageAssetRow | null>;
  create(input: {
    promptHash: string;
    prompt: string;
    provider: string;
    seed: number;
  }): Promise<ImageAssetRow>;
  /**
   * Второй конкурентный insert по unique(promptHash) бросает P2002 (Prisma)
   * — наружу отдаём ошибку с этим кодом, чтобы getOrCreateAsset её поймал.
   */
  createUniqueViolation(): Error;
  incrementHits(id: string): Promise<void>;
  updateFileUrl(id: string, fileUrl: string): Promise<void>;
  /** Шаг 5: сбой рендера удаляет строку — ретрай стартует с чистого листа. */
  remove?(id: string): Promise<void>;
}

export class P2002UniqueViolation extends Error {
  code = "P2002";
}

export function hashPrompt(prompt: string): string {
  return createHash("sha256")
    .update(prompt.trim().toLowerCase().replace(/\s+/g, " "))
    .digest("hex");
}

interface AssetWithCacheInfo {
  asset: ImageAssetRow;
  fromCache: boolean;
}

export async function getOrCreateAsset(
  prompt: string,
  store: ImageAssetStore,
  providerFn?: (
    prompt: string,
    seed: number,
    assetId?: string
  ) => Promise<{ url: string; provider: string }>
): Promise<AssetWithCacheInfo> {
  const promptHash = hashPrompt(prompt);

  const existing = await store.findByHash(promptHash);
  if (existing) {
    if (existing.fileUrl) {
      await store.incrementHits(existing.id);
      return { asset: existing, fromCache: true };
    }
    // Строка есть, файла нет — конкурент уже рендерит; ждём его файл.
    const polled = await pollFileUrl(existing, store);
    if (polled) return { asset: polled, fromCache: true };
    // Таймаут — не ошибка: вызывающий покажет SVG-заглушку.
    return { asset: existing, fromCache: true };
  }

  let row: ImageAssetRow;
  try {
    row = await store.create({
      promptHash,
      prompt,
      provider: resolveProviderName(),
      // Единственное место генерации seed: 0..999999.
      seed: Math.floor(Math.random() * 1_000_000),
    });
  } catch {
    // P2002: конкурент вставил строку раньше нас — перечитываем и ждём его файл.
    row = await handleUniqueViolation(promptHash, store);
    const polled = await pollFileUrl(row, store);
    if (polled) return { asset: polled, fromCache: true };
    return { asset: row, fromCache: true };
  }

  const render =
    providerFn ?? ((p: string, s: number) => getImageProvider()(p, s, row.id));
  const startedAt = Date.now();
  try {
    const result = await render(prompt, row.seed);
    await store.updateFileUrl(row.id, result.url);
    return { asset: { ...row, fileUrl: result.url }, fromCache: false };
  } catch (error) {
    // Чистим строку: следующий ретрай сгенерирует новый seed заново.
    await store.remove?.(row.id);
    throw error;
  } finally {
    if (process.env.NODE_ENV !== "test") {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      console.log(`[imageCache] render ${seconds}s provider=${row.provider}`);
    }
  }
}

async function handleUniqueViolation(
  promptHash: string,
  store: ImageAssetStore
): Promise<ImageAssetRow> {
  const reRead = await store.findByHash(promptHash);
  if (reRead) return reRead;
  const violation = store.createUniqueViolation();
  throw violation;
}

async function pollFileUrl(
  row: ImageAssetRow,
  store: ImageAssetStore
): Promise<ImageAssetRow | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const fresh = await store.findByHash(row.promptHash);
    if (!fresh) return null;
    if (fresh.fileUrl) {
      await store.incrementHits(fresh.id);
      return fresh;
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
