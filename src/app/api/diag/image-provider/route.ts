import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* Диагностика Workers AI: минимальный запрос к flux-1-schnell
   (1 шаг, короткий промпт) и честный статус наружу.
   Никаких секретов в ответе — только коды и текст ошибки. */

interface DiagResult {
  ok: boolean;
  status: number | null;
  message: string;
}

export async function GET(): Promise<NextResponse<DiagResult>> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json({
      ok: false,
      status: null,
      message: "CF_ACCOUNT_ID / CF_API_TOKEN не заданы в .env",
    });
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ prompt: "a small red apple", steps: 1 }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (response.ok) {
      const payload = (await response.json()) as { result?: { image?: string } };
      const hasImage = Boolean(payload.result?.image);
      return NextResponse.json({
        ok: hasImage,
        status: response.status,
        message: hasImage
          ? "Cloudflare Workers AI отвечает, изображение получено"
          : "HTTP 200, но изображения в ответе нет",
      });
    }

    const text = (await response.text()).slice(0, 300);
    const messages: Record<number, string> = {
      401: "Токен отклонён (401) — проверьте CF_API_TOKEN",
      403: "Доступ запрещён (403) — у токена нет прав Workers AI",
      429: "Квота исчерпана (429) — лимит Workers AI на сегодня",
    };
    return NextResponse.json({
      ok: false,
      status: response.status,
      message:
        messages[response.status] ??
        `Cloudflare вернул ${response.status}: ${text}`,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Таймаут запроса к Cloudflare (15 с)"
        : "Сеть недоступна — исходящие запросы из этой среды не проходят";
    return NextResponse.json({ ok: false, status: null, message });
  }
}
