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
  url: string;
  provider: string;
}

export type ImageProvider = (
  prompt: string,
  seed: number,
  assetId?: string
) => Promise<ImageRenderResult>;

export function resolveProviderName(): string {
  return "flux";
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
    if (error instanceof AiGatewayError && error.status === 429) {
      throw new ImageRateLimitError(3600);
    }
    throw error;
  }

  const url = await saveImage(base64, assetId);
  return { url, provider: "flux" };
}

async function saveImage(base64: string, assetId?: string): Promise<string> {
  const filename = `${assetId ?? `craft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}.jpg`;
  
  // Попытка сохранить на диск (/tmp для Vercel или uploads/crafts локально)
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    const isVercel = Boolean(process.env.VERCEL);
    const dir = isVercel
      ? path.join(os.tmpdir(), "crafts")
      : path.join(process.cwd(), "uploads", "crafts");

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), Buffer.from(base64, "base64"));
    return `/img/${filename}`;
  } catch (err) {
    console.warn("Could not save to filesystem, returning data URI fallback:", err);
    // 100% надежный fallback для Serverless сред — Data URI JPEG
    return `data:image/jpeg;base64,${base64}`;
  }
}
