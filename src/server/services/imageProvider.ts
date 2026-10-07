const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

export class ImageRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message?: string) {
    super(message ?? "Лимит провайдера картинок исчерпан");
    this.name = "ImageRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface ImageRenderResult {
  /** Локальный путь файла (cloudflare) либо внешний URL (pollinations). */
  url: string;
  provider: string;
}

export type ImageProvider = (prompt: string, seed: number) => Promise<ImageRenderResult>;

interface CloudflareResponse {
  result?: { image?: string };
  errors?: unknown[];
}

/**
 * Реестр провайдеров: вызывающий код не знает, кто активен.
 * Выбор — только через env IMAGE_PROVIDER.
 */
const registry: Record<string, ImageProvider> = {
  cloudflare: renderCloudflare,
  pollinations: renderPollinations,
};

export function getImageProvider(): ImageProvider {
  const name = process.env.IMAGE_PROVIDER || "pollinations";
  const provider = registry[name];
  if (!provider) {
    throw new Error(
      `Неизвестный IMAGE_PROVIDER "${name}" — доступны: ${Object.keys(registry).join(", ")}`
    );
  }
  return provider;
}

async function renderCloudflare(prompt: string, seed: number): Promise<ImageRenderResult> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error("CF_ACCOUNT_ID / CF_API_TOKEN не заданы — провайдер cloudflare недоступен");
  }

  const stepsRaw = Number(process.env.CF_STEPS) || 4;
  // Schnell умеет не больше 8 шагов — выше качество не растёт, квота тратится.
  const steps = Math.min(8, Math.max(1, stepsRaw));

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ prompt, seed, steps }),
    }
  );

  if (response.status === 429) {
    // Дневная квота не восстанавливается ретраем — сразу час тишины.
    throw new ImageRateLimitError(3600);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Cloudflare Workers AI ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as CloudflareResponse;
  const base64 = payload.result?.image;
  if (!base64) {
    throw new Error("Cloudflare не вернул изображение");
  }

  const url = await writeAssetFile(base64);
  return { url, provider: "cloudflare" };
}

async function writeAssetFile(base64: string): Promise<string> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const dir = path.join(process.cwd(), "uploads", "crafts");
  await fs.mkdir(dir, { recursive: true });

  const filename = `craft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await fs.writeFile(path.join(dir, filename), Buffer.from(base64, "base64"));
  return `/img/${filename}`;
}

function renderPollinations(prompt: string, seed: number): Promise<ImageRenderResult> {
  // Без ключа, локальные тесты: провайдер клеит водяной знак — в каталог
  // такие картинки не попадают, для продакшена ставьте cloudflare.
  return Promise.resolve({ url: pollinationsUrl(prompt, seed), provider: "pollinations" });
}

// Экспорт для тестов/отладки: сборка URL pollinations без ключа.
export function pollinationsUrl(prompt: string, seed: number): string {
  const encoded = encodeURIComponent(prompt);
  return `${POLLINATIONS_URL}/${encoded}?width=1024&height=1024&model=flux&seed=${seed}&nologo=true`;
}
