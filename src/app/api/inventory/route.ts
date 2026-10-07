import { NextResponse } from "next/server";
import { inventory, upsertInventoryItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ total: inventory.length, items: inventory });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { name, stock, unit } = (body ?? {}) as {
    name?: unknown;
    stock?: unknown;
    unit?: unknown;
  };

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Поле name обязательно и должно быть непустой строкой" },
      { status: 400 }
    );
  }
  if (typeof stock !== "number" || !Number.isFinite(stock) || stock < 0) {
    return NextResponse.json(
      { error: "Поле stock должно быть неотрицательным числом" },
      { status: 400 }
    );
  }
  if (typeof unit !== "string" || unit.trim().length === 0) {
    return NextResponse.json(
      { error: "Поле unit обязательно и должно быть непустой строкой" },
      { status: 400 }
    );
  }

  const item = upsertInventoryItem(name.trim(), stock, unit.trim());
  return NextResponse.json({ item }, { status: 201 });
}
