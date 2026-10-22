import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { PLAN_LABELS } from "@/lib/feature-flags";
import { listBoards, listCrafts, createBoard } from "@/lib/db-server";

export const dynamic = "force-dynamic";

/* Доски настроения. Лимиты по тарифу: Базовый — 3, Премиум — 20, Директор — 100. */

export async function GET(request: Request) {
  const user = getAuthUser(request);
  const allBoards = await listBoards();
  const allCrafts = await listCrafts();
  const withTitles = allBoards.map((board) => ({
    ...board,
    craftTitles: board.craftSlugs.map(
      (slug) => allCrafts.find((c) => c.slug === slug)?.title ?? slug
    ),
  }));
  return NextResponse.json({
    role: user.role,
    boardLimit: user.boardLimit,
    boards: withTitles,
  });
}

export async function POST(request: Request) {
  const user = getAuthUser(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const rawTitle = (body as { title?: unknown })?.title;
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";
  if (!title || title.length > 60) {
    return NextResponse.json(
      { error: "Название доски — строка от 1 до 60 символов" },
      { status: 400 }
    );
  }

  if ((await listBoards()).length >= user.boardLimit) {
    return NextResponse.json(
      {
        error:
          user.role === "basic"
            ? `На тарифе «Базовый» можно вести до ${user.boardLimit} досок. Оформите Премиум — до 20, или Директор — до 100.`
            : `Достигнут лимит в ${user.boardLimit} досок для тарифа «${PLAN_LABELS[user.role]}».`,
      },
      { status: 403 }
    );
  }

  const board = await createBoard({ title, craftSlugs: [] });
  return NextResponse.json({ board }, { status: 201 });
}
