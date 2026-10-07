const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

import { aiStats } from "@/lib/db";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Лимит Groq API исчерпан, попробуйте позже");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface GroqRateLimit {
  remainingRequests: number | null;
  remainingTokens: number | null;
}

export interface GroqJsonResult {
  data: Record<string, unknown>;
  ratelimit: GroqRateLimit;
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

export async function groqChatJson(
  systemPrompt: string,
  userPrompt: string
): Promise<GroqJsonResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY не задана — генерация недоступна");
  }
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const messages: ChatMessage[] = [
    // Системный промпт передаётся байт-в-байт без трима и преобразований —
    // любое изменение строки ломает prompt cache Groq.
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.4,
      reasoning_effort: "low",
      max_tokens: 1800,
    }),
  });

  const ratelimit = readRatelimit(response.headers);
  console.log(
    `[groq] remaining-requests=${ratelimit.remainingRequests} remaining-tokens=${ratelimit.remainingTokens}`
  );

  if (response.status === 429) {
    // 429 никогда не ретраим автоматически — решение об ожидании принимает вызывающий код.
    const retryAfterSeconds = Number(response.headers.get("retry-after")) || 60;
    throw new RateLimitError(retryAfterSeconds);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq API ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content ?? "";

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error("Groq вернул ответ, не являющийся JSON");
  }

  // Считаем только фактически завершённые вызовы (не 429/5xx), включая ретраи.
  aiStats.llmCalls += 1;

  return { data, ratelimit };
}

function readRatelimit(headers: Headers): GroqRateLimit {
  const num = (name: string): number | null => {
    const raw = headers.get(name);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  return {
    remainingRequests: num("x-ratelimit-remaining-requests"),
    remainingTokens: num("x-ratelimit-remaining-tokens"),
  };
}
