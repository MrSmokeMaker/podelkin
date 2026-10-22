import { NextResponse } from "next/server";
import { findProject, listCrafts, saveProject } from "@/lib/db-server";

export const dynamic = "force-dynamic";

/* PUT: отмечает шаг выполненным, копит время работы, обновляет статус проекта */
export async function PUT(
  request: Request,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { stepIndex, done, minutesSpent } = (body ?? {}) as {
    stepIndex?: unknown;
    done?: unknown;
    minutesSpent?: unknown;
  };

  if (
    typeof stepIndex !== "number" ||
    !Number.isInteger(stepIndex) ||
    stepIndex < 0 ||
    stepIndex >= project.steps.length
  ) {
    return NextResponse.json(
      { error: `stepIndex должен быть целым числом от 0 до ${project.steps.length - 1}` },
      { status: 400 }
    );
  }
  if (done !== undefined && typeof done !== "boolean") {
    return NextResponse.json(
      { error: "done должен быть булевым значением" },
      { status: 400 }
    );
  }
  if (
    minutesSpent !== undefined &&
    (typeof minutesSpent !== "number" ||
      !Number.isFinite(minutesSpent) ||
      minutesSpent < 0)
  ) {
    return NextResponse.json(
      { error: "minutesSpent должен быть неотрицательным числом" },
      { status: 400 }
    );
  }

  const step = project.steps[stepIndex];
  step.done = done ?? true;
  if (minutesSpent) step.minutesSpent += minutesSpent;

  const allCrafts = await listCrafts();
  const craft = allCrafts.find((c) => c.slug === project.craftSlug);
  const allDone = project.steps.every((s) => s.done);
  project.status =
    allDone && (craft ? project.steps.length === craft.steps.length : true)
      ? "готов"
      : "в работе";
  project.updatedAt = new Date().toISOString();

  await saveProject(project);

  return NextResponse.json({ project });
}
