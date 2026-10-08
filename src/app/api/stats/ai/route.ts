import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { aiStats } from "@/lib/db";

export const dynamic = "force-dynamic";

/* IMAGE_QUOTA_PER_DAY: дневная квота картинок для показа остатка.
   Дельта уже потраченного за сегодня считаем от imageRenders (miss = один рендер,
   попавших в кэш повторных вызовов провайдер не видит). */
const DEFAULT_IMAGE_QUOTA = 2000;

/* Аналитика ИИ-контура — возможность «Директора» (aiInsights). */
export async function GET(request: Request) {
  const user = getAuthUser(request);
  if (!user.features.allowed.includes("aiInsights")) {
    return NextResponse.json(
      {
        error:
          "Аналитика генераций доступна на тарифе «Директор».",
      },
      { status: 403 }
    );
  }

  const { llmCalls, imageRenders, cacheHits, cacheMisses } = aiStats;
  const denominator = cacheHits + cacheMisses;

  const dailyQuota = Number(process.env.IMAGE_QUOTA_PER_DAY) || DEFAULT_IMAGE_QUOTA;
  const remainingImageQuota = Math.max(0, dailyQuota - imageRenders);

  return NextResponse.json({
    llmCalls,
    imageRenders,
    cacheHits,
    cacheMisses,
    hitsRatio: denominator === 0 ? 0 : Number((cacheHits / denominator).toFixed(3)),
    remainingImageQuota,
  });
}
