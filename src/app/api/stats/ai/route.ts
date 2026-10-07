import { NextResponse } from "next/server";
import { aiStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { llmCalls, imageRenders, cacheHits, cacheMisses } = aiStats;
  const denominator = cacheHits + cacheMisses;
  return NextResponse.json({
    llmCalls,
    imageRenders,
    cacheHits,
    cacheMisses,
    hitsRatio: denominator === 0 ? 0 : Number((cacheHits / denominator).toFixed(3)),
  });
}
