import {
  BOARD_LIMITS,
  GENERATION_LIMITS,
  PROJECT_LIMITS,
  ROLES,
  resolveFeatures,
  type Feature,
  type Role,
} from "@/lib/feature-flags";
import { SESSION_COOKIE, getUserBySessionToken } from "@/lib/users";

/* Аутентификация по сессии: токен из httpOnly-cookie ищется в хранилище
   пользователей. Гость (без cookie) получает тариф «Базовый» — генерация
   и базовые функции доступны и без регистрации. */

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  features: { allowed: Feature[]; blocked: Feature[] };
  boardLimit: number;
  projectLimit: number;
  generationLimit: number;
}

function fallbackRole(): Role {
  const env = process.env.DEFAULT_ROLE;
  return (ROLES as string[]).includes(env ?? "") ? (env as Role) : "basic";
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function getAuthUser(request: Request): AuthUser {
  const token = readCookie(request, SESSION_COOKIE);
  const user = token ? getUserBySessionToken(token) : null;
  const role: Role = user?.plan ?? fallbackRole();
  return {
    id: user?.id ?? "guest",
    name: user?.name ?? null,
    email: user?.email ?? null,
    role,
    features: resolveFeatures(role),
    boardLimit: BOARD_LIMITS[role],
    projectLimit: PROJECT_LIMITS[role],
    generationLimit: GENERATION_LIMITS[role],
  };
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
