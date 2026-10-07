import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  countGenerationsToday,
  createAiDraft,
  findCachedAiDraft,
  registerGeneration,
} from "@/lib/db";
import { generateCraftDraft, normalizeTopic } from "@/server/services/craftDraft";
import { RateLimitError } from "@/server/services/groqClient";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  const perDay = Number(process.env.GEN_PER_USER_PER_DAY) || 5;

  // Лимит проверяем ДО обращения к Groq — платные вызовы не тратятся впустую.
  if (countGenerationsToday(user.id) >= perDay) {
    return NextResponse.json(
      { error: "Лимит генераций на сегодня исчерпан" },
      { status: 429 }
    );
  }

  let topic = "";
  try {
    const body = (await request.json()) as { topic?: unknown };
    topic = typeof body.topic === "string" ? body.topic.trim() : "";
  } catch {
    topic = "";
  }
  if (topic.length < 3 || topic.length > 120) {
    return NextResponse.json(
      { error: "Укажите тему генерации — от 3 до 120 символов" },
      { status: 400 }
    );
  }

  try {
    const result = await generateCraftDraft(topic, (normalizedTopic) =>
      findCachedAiDraft(normalizedTopic, DAY_MS)
    );

    if (!result.valid || !result.data) {
      return NextResponse.json(
        { error: "Модель вернула некорректный JSON" },
        { status: 502 }
      );
    }

    // Попадание в кэш Groq не тратит — квота списывается только за генерацию.
    if (!result.cached) {
      registerGeneration(user.id);
    }

    const draft = createAiDraft({
      topic,
      normalizedTopic: normalizeTopic(topic),
      payload: result.data,
      valid: true,
    });

    return NextResponse.json(
      {
        draftId: draft.id,
        data: result.data,
        remainingQuota: Math.max(0, perDay - countGenerationsToday(user.id)),
        cached: Boolean(result.cached),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: error.message, retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "Сервис генерации недоступен, попробуйте позже" },
      { status: 502 }
    );
  }
}
