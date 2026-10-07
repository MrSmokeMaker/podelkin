import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  countGenerationsToday,
  createAiDraft,
  findCachedAiDraft,
  registerGeneration,
} from "@/lib/db";
import { generateCraftDraft, normalizeTopic } from "@/server/services/craftDraft";
import { AiGatewayError } from "@/server/services/aiClient";
import { fetchSourceText } from "@/server/services/sourceFetcher";

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
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    url = "";
  }
  const parsedUrl = parseSourceUrl(url);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "Укажите ссылку на страницу с поделкой (https://…)" },
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

  try {
    const result = await generateCraftDraft(sourceText, (normalizedTopic) =>
      findCachedAiDraft(normalizedTopic, DAY_MS)
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
      topic: parsedUrl.href,
      normalizedTopic: normalizeTopic(parsedUrl.href),
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

/**
 * Только публичные http(s)-адреса: никакой localhost, внутренней сети
 * и нестандартных схем — пользовательский ввод не превращается в SSRF.
 */
function parseSourceUrl(raw: string): URL | null {
  if (raw.length === 0 || raw.length > 2000) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    // Голый IPv4 (включая приватные диапазоны 10.x, 192.168.x, 169.254.x) — сразу нет.
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host === "0.0.0.0" ||
    host === "[::1]"
  ) {
    return null;
  }
  return parsed;
}
