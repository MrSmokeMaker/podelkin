import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PLAN_LABELS, formatLimit } from "@/lib/feature-flags";
import { listCrafts, listProjects, createProject } from "@/lib/db-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const allProjects = await listProjects();
  return NextResponse.json({ total: allProjects.length, projects: allProjects });
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

  const allCrafts = await listCrafts();
  const craft = allCrafts.find((c) => c.slug === craftSlug);
  if (!craft) {
    return NextResponse.json(
      { error: `Мастер-класс «${craftSlug}» не найден` },
      { status: 404 }
    );
  }

  /* Лимит тарифа считает проекты «в работе». */
  const allProjects = await listProjects();
  const activeCount = allProjects.filter(
    (p) => p.status === "в работе"
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

  const project = await createProject(craft);
  return NextResponse.json({ project }, { status: 201 });
}
