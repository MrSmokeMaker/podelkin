import { z } from "zod";
import { AiGatewayError, workerTextJson } from "./aiClient";
import { FROM_SCRATCH_PROMPT, SOURCE_ANALYSIS_PROMPT, TAGS_PROMPT } from "./craftPrompt";

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
  /** Какая из двух сетей ответила (mistral | cloudflare) — для логов и диагностики. */
  provider?: string;
}

export type CraftGenerationInput =
  | { kind: "source"; text: string }
  | { kind: "topic"; prompt: string };

export interface DraftCacheRow {
  payload: unknown;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Нормализация темы/URL для cache-ключа: регистр, ё, пробелы, пунктуация. */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Два режима длинного вызова: анализ страницы-источника (kind: "source")
 * или придумывание с нуля по текстовому запросу (kind: "topic").
 * Затем короткий вызов (Cloudflare Mistral) уточняет теги.
 * Один повтор длинного вызова, если модель вернула невалидный JSON.
 */
export async function generateCraftDraft(
  input: CraftGenerationInput,
  findCachedDraft?: (normalizedTopic: string) => DraftCacheRow | null | Promise<DraftCacheRow | null>
): Promise<CraftDraftResult> {
  const cacheEnabled = process.env.CACHE_LLM === "true";

  if (cacheEnabled && findCachedDraft) {
    const cacheSource = input.kind === "topic" ? input.prompt : input.text;
    const cached = await findCachedDraft(normalizeTopic(cacheSource.slice(0, 500)));
    if (cached) {
      return { valid: true, data: cached.payload as CraftDraftData, cached: true };
    }
  }

  const first = await callDraftGeneration(input, false);
  if (first.valid) {
    return finalizeTags(first);
  }

  // Ровно один повтор с дополнительной инструкцией «только валидный JSON».
  const second = await callDraftGeneration(input, true);
  if (second.valid) {
    return finalizeTags(second);
  }

  return { valid: false, error: second.error ?? "Модель вернула некорректный JSON" };
}

async function callDraftGeneration(
  input: CraftGenerationInput,
  retry: boolean
): Promise<CraftDraftResult> {
  const system = input.kind === "topic" ? FROM_SCRATCH_PROMPT : SOURCE_ANALYSIS_PROMPT;
  const base =
    input.kind === "topic"
      ? `Запрос пользователя: ${input.prompt}`
      : `Текст страницы-источника:\n\n${input.text}`;
  const userPrompt = retry
    ? `${base}\n\nПредыдущий ответ не был валидным JSON. Верни валидный JSON — без markdown, без комментариев, только объект по схеме.`
    : base;

  let result;
  try {
    result = await workerTextJson({
      system,
      prompt: userPrompt,
      mode: "long",
      maxTokens: 2800,
    });
  } catch (error) {
    // Квоту шлюза (429) пробрасываем: роутер покажет пользователю честный лимит.
    if (error instanceof AiGatewayError && error.status === 429) {
      throw error;
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Ошибка сети ИИ-шлюза",
    };
  }

  const parsed = draftSchema.safeParse(result.data);
  if (!parsed.success) {
    return { valid: false, error: "Схема ответа не прошла валидацию", provider: result.provider };
  }

  const data = normalizeDraft(parsed.data);
  const verified = draftSchema.safeParse(data);
  if (!verified.success) {
    return { valid: false, error: "Схема ответа не прошла валидацию", provider: result.provider };
  }

  return { valid: true, data: verified.data, provider: result.provider };
}

/** Короткий вызов: финальные теги. Сбой не валит черновик — остаются теги из long-вызова. */
async function finalizeTags(draft: CraftDraftResult): Promise<CraftDraftResult> {
  if (!draft.data) {
    return draft;
  }
  try {
    const result = await workerTextJson({
      system: TAGS_PROMPT,
      prompt: `Заголовок: ${draft.data.title}\nКатегория: ${draft.data.category}\nКратко: ${draft.data.summary}`,
      mode: "short",
      maxTokens: 300,
    });
    const tags = (result.data as { tags?: unknown }).tags;
    if (Array.isArray(tags)) {
      const clean = tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5);
      if (clean.length > 0) {
        draft.data.tags = clean;
        draft.provider = result.provider;
      }
    }
  } catch {
    // Теги — украшение: при сбое короткого вызова оставляем теги long-вызова.
  }
  return draft;
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
