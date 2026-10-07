import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { boards, crafts } from "@/lib/db";

export const dynamic = "force-dynamic";

/* Доски настроения. Лимиты по тарифу: free — 3, premium/admin — 20. */

export function GET(request: Request) {
  const user = getAuthUser(request);
  const withTitles = boards.map((board) => ({
    ...board,
    craftTitles: board.craftSlugs.map(
      (slug) => crafts.find((c) => c.slug === slug)?.title ?? slug
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

  if (boards.length >= user.boardLimit) {
    return NextResponse.json(
      {
        error:
          user.role === "free"
            ? `На бесплатном тарифе можно вести до ${user.boardLimit} досок. Оформите Premium, чтобы создавать до 20 досок.`
            : `Достигнут лимит в ${user.boardLimit} досок для тарифа «${user.role}».`,
      },
      { status: 403 }
    );
  }

  const board = {
    id: `board-${Date.now().toString(36)}`,
    title,
    craftSlugs: [] as string[],
  };
  boards.push(board);
  return NextResponse.json({ board }, { status: 201 });
}
