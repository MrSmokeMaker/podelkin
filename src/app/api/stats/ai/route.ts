import { NextResponse } from "next/server";
import { aiStats } from "@/lib/db";

export const dynamic = "force-dynamic";

/* CF_FREE_IMAGE_PER_DAY: дневная квота картинок провайдера.
   Дельта уже потраченного за сегодня считаем от imageRenders (miss = один рендер,
   попавших в кэш повторных вызовов провайдер не видит). */
const DEFAULT_IMAGE_QUOTA = 2000;

export async function GET() {
  const { llmCalls, imageRenders, cacheHits, cacheMisses } = aiStats;
  const denominator = cacheHits + cacheMisses;

  const dailyQuota = Number(process.env.CF_FREE_IMAGE_PER_DAY) || DEFAULT_IMAGE_QUOTA;
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
