import { AiGatewayError, workerImage } from "./aiClient";

export class ImageRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(message ?? "Лимит провайдера картинок исчерпан");
    this.name = "ImageRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ImageRenderResult {
  /** Локальный путь файла: воркер возвращает base64, файл кладём в uploads. */
  url: string;
  provider: string;
}

export type ImageProvider = (
  prompt: string,
  seed: number,
  assetId?: string
) => Promise<ImageRenderResult>;

// Провайдер один — наш воркер (cloudflare/worker.js → FLUX-1-schnell).
// Прямые вызовы Cloudflare API и pollinations удалены: ключей в приложении больше нет.
export function resolveProviderName(): string {
  return "worker";
}

export function getImageProvider(): ImageProvider {
  return renderViaWorker;
}

async function renderViaWorker(
  prompt: string,
  seed: number,
  assetId?: string
): Promise<ImageRenderResult> {
  let base64: string;
  try {
    base64 = await workerImage(prompt, seed);
  } catch (error) {
    // Дневная квота Workers AI не восстанавливается ретраем — час тишины.
    if (error instanceof AiGatewayError && error.status === 429) {
      throw new ImageRateLimitError(3600);
    }
    throw error;
  }

  const url = await writeAssetFile(base64, assetId);
  return { url, provider: "worker" };
}

async function writeAssetFile(base64: string, assetId?: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const dir = path.join(process.cwd(), "uploads", "crafts");
  await fs.mkdir(dir, { recursive: true });

  const filename = `${assetId ?? `craft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}.jpg`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(base64, "base64"));
  return `/img/${filename}`;
}
