import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PLAN_LABELS, formatLimit } from "@/lib/feature-flags";
import { crafts, createProject, projects } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ total: projects.length, projects });
}

export async function POST(request: Request) {
  const user = getAuthUser(request);

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

  /* Лимит тарифа считает только «в работе» проекты пользователя. */
  const activeCount = projects.filter(
    (p) => p.status === "в работе" && p.ownerId === user.id
  ).length;
  if (activeCount >= user.projectLimit) {
    return NextResponse.json(
      {
        error: `Лимит тарифа «${PLAN_LABELS[user.role]}»: ${formatLimit(
          user.projectLimit
        )} проектов одновременно. Завершите текущий или поднимите тариф.`,
      },
      { status: 403 }
    );
  }

  const project = createProject(craft, user.id);
  return NextResponse.json({ project }, { status: 201 });
}
