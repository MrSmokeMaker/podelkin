import { z } from "zod";
import { groqChatJson, RateLimitError } from "./groqClient";
import { SYSTEM_PROMPT } from "./craftPrompt";

const stepSchema = z.object({
  n: z.number().int().positive(),
  text: z.string().min(5),
  minutes: z.number().int().min(1).max(600),
});

const draftSchema = z.object({
  title: z.string().min(3).max(80),
  summary: z.string().min(10).max(400),
  category: z.string().min(2).max(30),
  difficulty: z.enum(["Легко", "Средне", "Сложно"]),
  estimatedTimeMin: z.number().int().min(10).max(600),
  steps: z.array(stepSchema).min(5).max(7),
  materials: z
    .array(
      z.object({
        name: z.string().min(2).max(60),
        qty: z.number().positive().max(1000),
        unit: z.enum(["шт", "м", "г", "мл"]),
        optional: z.boolean(),
      })
    )
    .min(1)
    .max(10),
  tools: z.array(z.string().min(1).max(40)).max(10),
  tags: z.array(z.string().min(1).max(24)).max(6),
  safetyNotes: z.string().max(300).nullable(),
  imagePrompt: z.string().min(20).max(1900),
});

export type CraftDraftData = z.infer<typeof draftSchema>;

export interface CraftDraftResult {
  valid: boolean;
  data?: CraftDraftData;
  error?: string;
  cached?: boolean;
  ratelimit?: { remainingRequests: number | null; remainingTokens: number | null };
}

export interface DraftCacheRow {
  payload: unknown;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Нормализация темы для cache-ключа: регистр, ё, пробелы, пунктуация. */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export async function generateCraftDraft(
  topic: string,
  findCachedDraft?: (normalizedTopic: string) => CraftDraftRow | null | Promise<CraftDraftRow | null>
): Promise<CraftDraftResult> {
  const cacheEnabled = process.env.CACHE_LLM === "true";

  if (cacheEnabled && findCachedDraft) {
    const cached = await findCachedDraft(normalizeTopic(topic));
    if (cached) {
      return { valid: true, data: cached.payload as CraftDraftData, cached: true };
    }
  }

  const first = await callGroqWithValidation(topic, false);
  if (first.valid) {
    return first;
  }
  if (first.ratelimitError) {
    throw first.ratelimitError;
  }

  // Ровно один повтор с дополнительной инструкцией «только валидный JSON».
  const second = await callGroqWithValidation(topic, true);
  if (second.valid) {
    return second;
  }
  if (second.ratelimitError) {
    throw second.ratelimitError;
  }

  return { valid: false, error: "Модель вернула некорректный JSON" };
}

interface CallOutcome extends CraftDraftResult {
  ratelimitError?: RateLimitError;
}

async function callGroqWithValidation(
  topic: string,
  retry: boolean
): Promise<CallOutcome> {
  const userPrompt = retry
    ? `Тема: ${topic}\n\nПредыдущий ответ не был валидным JSON. Верни валидный JSON only — без markdown, без комментариев, только объект по схеме.`
    : `Тема: ${topic}`;

  let result;
  try {
    result = await groqChatJson(SYSTEM_PROMPT, userPrompt);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { valid: false, ratelimitError: error };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Ошибка сети Groq",
    };
  }

  const parsed = draftSchema.safeParse(result.data);
  if (!parsed.success) {
    return { valid: false, error: "Схема ответа не прошла валидацию", ratelimit: result.ratelimit };
  }

  const data = normalizeDraft(parsed.data);
  const verified = draftSchema.safeParse(data);
  if (!verified.success) {
    return { valid: false, error: "Схема ответа не прошла валидацию", ratelimit: result.ratelimit };
  }

  return { valid: true, data: verified.data, ratelimit: result.ratelimit };
}

function normalizeDraft(data: CraftDraftData): CraftDraftData {
  const steps = data.steps
    .slice(0, 7)
    .map((step, index) => ({ ...step, n: index + 1 }));

  // Сумма шагов должна сходиться с estimatedTimeMin — корректируем последний шаг.
  const sum = steps.reduce((total, step) => total + step.minutes, 0);
  if (steps.length > 0 && sum !== data.estimatedTimeMin) {
    steps[steps.length - 1] = {
      ...steps[steps.length - 1],
      minutes: Math.max(1, data.estimatedTimeMin - sum + steps[steps.length - 1].minutes),
    };
  }

  return {
    ...data,
    estimatedTimeMin: clamp(data.estimatedTimeMin, 10, 600),
    steps,
    materials: data.materials.slice(0, 10),
  };
}
