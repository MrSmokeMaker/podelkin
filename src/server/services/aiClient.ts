// Единая точка входа к обеим ИИ-сетям — через наш воркер (cloudflare/worker.js).
// Текст: POST /text (long — Mistral API напрямую, short/fallback — Cloudflare Mistral).
// Картинки: POST /image (FLUX-1-schnell, 1024×768, base64 JPEG в ответе).

export class AiGatewayError extends Error {
  status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AiGatewayError";
    this.status = status;
  }
}

export interface WorkerTextResult {
  data: Record<string, unknown>;
  provider: string;
}

function gatewayUrl(): string {
  const base = process.env.WORKER_URL;
  if (!base) {
    throw new AiGatewayError("WORKER_URL не задан — AI-генерация недоступна");
  }
  return base.replace(/\/+$/, "");
}

export async function workerTextJson(input: {
  system: string;
  prompt: string;
  mode: "short" | "long";
  maxTokens?: number;
}): Promise<WorkerTextResult> {
  const response = await fetch(`${gatewayUrl()}/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system: input.system,
      prompt: input.prompt,
      mode: input.mode,
      maxTokens: input.maxTokens,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AiGatewayError(`AI-шлюз ${response.status}: ${body.slice(0, 300)}`, response.status);
  }

  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
    provider?: string;
  };
  if (!payload.data) {
    throw new AiGatewayError("AI-шлюз вернул ответ без поля data");
  }
  return { data: payload.data, provider: payload.provider ?? "unknown" };
}

export async function workerImage(prompt: string, seed: number): Promise<string> {
  const response = await fetch(`${gatewayUrl()}/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, seed }),
    signal: AbortSignal.timeout(90_000),
  });

  if (response.status === 429) {
    // Дневная квота Workers AI не восстанавливается ретраем — сразу час тишины.
    throw new AiGatewayError("Квота генерации картинок исчерпана", 429);
  }
  if (!response.ok) {
    const body = await response.text();
    throw new AiGatewayError(`AI-шлюз /image ${response.status}: ${body.slice(0, 300)}`, response.status);
  }

  const payload = (await response.json()) as { image?: string };
  if (!payload.image) {
    throw new AiGatewayError("Шлюз не вернул изображение");
  }
  return payload.image;
}
