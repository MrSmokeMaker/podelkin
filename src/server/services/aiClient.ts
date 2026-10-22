// Единая точка входа к ИИ:
// 1. Если задан MISTRAL_API_KEY — работаем напрямую с Mistral API:
//    - open-mistral-nemo (128K контекст, современная и умная модель для инструкций и парсинга сайтов)
//    - fallback на ministral-8b-latest / open-mistral-7b
// 2. Если задан WORKER_URL — через Cloudflare Worker (cloudflare/worker.js).
// Картинки:
// 1. Если доступен WORKER_URL — через воркер (FLUX-1-schnell).
// 2. Иначе fallback на Pollinations AI (FLUX) — бесплатно, мгновенно генерирует JPEG высокого качества.

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

function gatewayUrl(): string | null {
  const base = process.env.WORKER_URL;
  if (!base || base.includes("your-worker-subdomain")) {
    return null;
  }
  return base.replace(/\/+$/, "");
}

function parseJsonLoose(content: string): Record<string, unknown> {
  if (!content) {
    throw new Error("Пустой ответ от модели");
  }
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as Record<string, unknown>;
    }
    throw new Error("Модель вернула ответ, не являющийся JSON: " + content.slice(0, 120));
  }
}

const CANDIDATE_MODELS = [
  "open-mistral-nemo",
  "ministral-8b-latest",
  "open-mistral-7b",
  "mistral-small-latest",
];

async function callDirectMistral(input: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<WorkerTextResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new AiGatewayError("MISTRAL_API_KEY не задан");
  }

  let lastError: Error | null = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          max_tokens: input.maxTokens ?? 2800,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.prompt },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (response.status === 429) {
        // Пробуем следующую модель из списка
        lastError = new AiGatewayError(`Модель ${model} превысила рейт-лимит (429)`, 429);
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new AiGatewayError(`Mistral ${model} ${response.status}: ${text.slice(0, 200)}`, response.status);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const data = parseJsonLoose(content);

      return { data, provider: `mistral-${model}` };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof AiGatewayError && err.status === 429) {
        continue;
      }
      break;
    }
  }

  throw lastError ?? new AiGatewayError("Все модели Mistral API вернули ошибку");
}

export async function workerTextJson(input: {
  system: string;
  prompt: string;
  mode: "short" | "long";
  maxTokens?: number;
}): Promise<WorkerTextResult> {
  // Приоритет 1: Прямой Mistral API
  if (process.env.MISTRAL_API_KEY) {
    try {
      return await callDirectMistral(input);
    } catch (err) {
      console.warn("Direct Mistral API call failed, trying worker fallback if available...", err);
      if (!gatewayUrl()) {
        throw err;
      }
    }
  }

  // Приоритет 2: Cloudflare Worker
  const gw = gatewayUrl();
  if (gw) {
    const response = await fetch(`${gw}/text`, {
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
    return { data: payload.data, provider: payload.provider ?? "worker" };
  }

  throw new AiGatewayError("Не настроен ни MISTRAL_API_KEY, ни рабочий WORKER_URL");
}

export async function workerImage(prompt: string, seed: number): Promise<string> {
  // 1. Попытка через воркер, если он настроен
  const gw = gatewayUrl();
  if (gw) {
    try {
      const response = await fetch(`${gw}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, seed }),
        signal: AbortSignal.timeout(90_000),
      });

      if (response.status === 429) {
        throw new AiGatewayError("Квота генерации картинок исчерпана", 429);
      }
      if (response.ok) {
        const payload = (await response.json()) as { image?: string };
        if (payload.image) return payload.image;
      }
    } catch (error) {
      console.warn("Worker image failed, falling back to Pollinations AI...", error);
    }
  }

  // 2. Fallback на Pollinations AI (FLUX) — бесплатно, мгновенно генерирует JPEG
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 400));
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${seed}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new AiGatewayError(`Image generation failed: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}
