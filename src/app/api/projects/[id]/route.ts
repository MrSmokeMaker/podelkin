import { NextResponse } from "next/server";
import { findProject } from "@/lib/db-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await findProject(id);
  if (!project) {
    return NextResponse.json(
      { error: `Проект «${id}» не найден` },
      { status: 404 }
    );
  }
  return NextResponse.json({ project });
}
