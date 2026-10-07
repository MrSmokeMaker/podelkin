import { NextResponse } from "next/server";
import { workerImage } from "@/server/services/aiClient";

export const dynamic = "force-dynamic";

/* Диагностика AI-шлюза: минимальный запрос к FLUX через наш воркер
   (короткий промпт) и честный статус наружу.
   Никаких секретов в ответе — только коды и текст ошибки. */

interface DiagResult {
  ok: boolean;
  status: number | null;
  message: string;
}

export async function GET(): Promise<NextResponse<DiagResult>> {
  if (!process.env.WORKER_URL) {
    return NextResponse.json({
      ok: false,
      status: null,
      message: "WORKER_URL не задан в .env — AI-генерация недоступна",
    });
  }

  try {
    // 1 шаг FLUX не выбираем: воркер сам фиксирует параметры (1024×768, steps 4).
    const image = await workerImage("a small red apple on a neutral background", 42);

    return NextResponse.json({
      ok: image.length > 100,
      status: 200,
      message:
        image.length > 100
          ? "AI-шлюз отвечает, изображение получено"
          : "Шлюз ответил, но изображение пустое",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({
        ok: false,
        status: null,
        message: "Таймаут запроса к AI-шлюзу (90 с)",
      });
    }
    const status = "status" in error && typeof error.status === "number" ? error.status : null;
    const text = error instanceof Error ? error.message.slice(0, 300) : "неизвестная ошибка";
    const messages: Record<number, string> = {
      401: "Шлюз отклонил запрос (401) — воркер требует секрет, которого нет",
      403: "Доступ запрещён (403) — проверьте права воркера на Workers AI",
      429: "Квота исчерпана (429) — лимит Workers AI на сегодня",
      502: "Mistral/FLUX в воркере ответили ошибкой (502) — смотрите логи wrangler",
      503: "Шлюз недоступен (503) — воркер не задеплоен или спит",
    };
    return NextResponse.json({
      ok: false,
      status,
      message: (status !== null && messages[status]) || `Шлюз вернул ошибку: ${text}`,
    });
  }
}
