import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  toPublicUser,
  verifyCredentials,
} from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Укажите e-mail и пароль" },
      { status: 400 }
    );
  }

  const user = verifyCredentials(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Неверный e-mail или пароль" },
      { status: 401 }
    );
  }

  const token = createSession(user.id);
  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(SESSION_TTL_MS / 1000)
  );
  return response;
}
