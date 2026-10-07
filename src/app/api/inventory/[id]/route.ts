import { NextResponse } from "next/server";
import { deleteInventoryItem } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!deleteInventoryItem(id)) {
    return NextResponse.json(
      { error: `Позиция запасов «${id}» не найдена` },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
