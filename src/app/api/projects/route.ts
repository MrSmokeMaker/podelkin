import { NextResponse } from "next/server";
import { crafts, createProject, projects } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ total: projects.length, projects });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { craftSlug } = (body ?? {}) as { craftSlug?: unknown };
  if (typeof craftSlug !== "string" || craftSlug.trim().length === 0) {
    return NextResponse.json(
      { error: "Поле craftSlug обязательно" },
      { status: 400 }
    );
  }

  const craft = crafts.find((c) => c.slug === craftSlug);
  if (!craft) {
    return NextResponse.json(
      { error: `Мастер-класс «${craftSlug}» не найден` },
      { status: 404 }
    );
  }

  const project = createProject(craft);
  return NextResponse.json({ project }, { status: 201 });
}
