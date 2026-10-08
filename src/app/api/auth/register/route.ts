import { NextRequest, NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  createSession,
  createUser,
  toPublicUser,
} from "@/lib/users";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { name, email, password } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };

  const nameValue = typeof name === "string" ? name.trim() : "";
  const emailValue = typeof email === "string" ? email.trim() : "";
  const passwordValue = typeof password === "string" ? password : "";

  if (nameValue.length < 2 || nameValue.length > 40) {
    return NextResponse.json(
      { error: "Имя — от 2 до 40 символов" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(emailValue)) {
    return NextResponse.json({ error: "Введите корректный e-mail" }, { status: 400 });
  }
  if (passwordValue.length < 6) {
    return NextResponse.json(
      { error: "Пароль — минимум 6 символов" },
      { status: 400 }
    );
  }

  let user;
  try {
    user = createUser({ name: nameValue, email: emailValue, password: passwordValue });
  } catch (error) {
    if (error instanceof Error && error.message === "email-taken") {
      return NextResponse.json(
        { error: "Пользователь с таким e-mail уже зарегистрирован" },
        { status: 409 }
      );
    }
    throw error;
  }

  const token = createSession(user.id);
  const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(SESSION_TTL_MS / 1000)
  );
  return response;
}
