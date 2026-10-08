import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  countGenerationsToday,
  createAiDraft,
  findCachedAiDraft,
  registerGeneration,
} from "@/lib/db";
import {
  generateCraftDraft,
  normalizeTopic,
  type CraftGenerationInput,
} from "@/server/services/craftDraft";
import { AiGatewayError } from "@/server/services/aiClient";
import { fetchSourceText, parseSourceUrl } from "@/server/services/sourceFetcher";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
// Лимит текста источника: длинный контекст Mistral вмещает статью целиком,
// но читать гигабайтные страницы наружу не нужно.
const MAX_SOURCE_TEXT = 120_000;

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  const perDay = Number(process.env.GEN_PER_USER_PER_DAY) || 5;

  // Лимит проверяем ДО обращения к ИИ — платные вызовы не тратятся впустую.
  if (countGenerationsToday(user.id) >= perDay) {
    return NextResponse.json(
      { error: "Лимит генераций на сегодня исчерпан" },
      { status: 429 }
    );
  }

  let url = "";
  let promptText = "";
  try {
    const body = (await request.json()) as { url?: unknown; prompt?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
    promptText = typeof body.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    url = "";
  }

  // Два режима: текстовый запрос — придумать с нуля, ссылка — разобрать источник.
  let generationInput: CraftGenerationInput;
  let topicKey: string;

  if (promptText.length > 0) {
    if (promptText.length < 3 || promptText.length > 500) {
      return NextResponse.json(
        { error: "Опишите поделку в 3–500 символах" },
        { status: 400 }
      );
    }
    generationInput = { kind: "topic", prompt: promptText };
    topicKey = promptText;
  } else {
    const parsedUrl = parseSourceUrl(url);
    if (!parsedUrl) {
      return NextResponse.json(
        {
          error:
            "Опишите поделку текстом или укажите ссылку на страницу с оригиналом (https://…)",
        },
        { status: 400 }
      );
    }

    let sourceText: string;
    try {
      sourceText = await fetchSourceText(parsedUrl, MAX_SOURCE_TEXT);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "Страница-источник не ответила за 15 секунд"
          : "Не удалось скачать страницу-источник";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    generationInput = { kind: "source", text: sourceText };
    topicKey = parsedUrl.href;
  }

  try {
    // Ключ кэша — стабильный (запрос или URL), а не первые строки страницы.
    const result = await generateCraftDraft(generationInput, () =>
      findCachedAiDraft(normalizeTopic(topicKey), DAY_MS)
    );

    if (!result.valid || !result.data) {
      return NextResponse.json(
        { error: "Модель вернула некорректный JSON" },
        { status: 502 }
      );
    }

    // Попадание в кэш не тратит квоту — списываем только за генерацию.
    if (!result.cached) {
      registerGeneration(user.id);
    }

    const draft = createAiDraft({
      topic: topicKey,
      normalizedTopic: normalizeTopic(topicKey),
      payload: result.data,
      valid: true,
    });

    return NextResponse.json(
      {
        draftId: draft.id,
        data: result.data,
        provider: result.provider,
        remainingQuota: Math.max(0, perDay - countGenerationsToday(user.id)),
        cached: Boolean(result.cached),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AiGatewayError && error.status === 429) {
      return NextResponse.json(
        { error: "Лимит ИИ-шлюза исчерпан, попробуйте позже" },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Сервис генерации недоступен, попробуйте позже" },
      { status: 502 }
    );
  }
}
