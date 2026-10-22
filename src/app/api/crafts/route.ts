import { NextResponse } from "next/server";
import { searchCrafts, type SortMode } from "@/lib/search";

export const dynamic = "force-dynamic";

const SORTS: SortMode[] = ["relevance", "time", "cost"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? undefined;
  const difficulty = searchParams.get("difficulty") ?? undefined;
  const sortParam = searchParams.get("sort");
  const maxTimeMinRaw = searchParams.get("maxTimeMin");

  const maxTimeMin = maxTimeMinRaw === null ? undefined : Number(maxTimeMinRaw);
  if (maxTimeMin !== undefined && (!Number.isFinite(maxTimeMin) || maxTimeMin < 0)) {
    return NextResponse.json(
      { error: "maxTimeMin должен быть неотрицательным числом" },
      { status: 400 }
    );
  }
  const sort = SORTS.includes(sortParam as SortMode)
    ? (sortParam as SortMode)
    : "relevance";

  const response = await searchCrafts({ q, category, difficulty, maxTimeMin, sort });
  return NextResponse.json(response);
}
