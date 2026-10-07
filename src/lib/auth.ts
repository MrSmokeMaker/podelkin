import {
  BOARD_LIMITS,
  ROLES,
  resolveFeatures,
  type Feature,
  type Role,
} from "@/lib/feature-flags";

/* Мок-слой аутентификации: реального логина/JWT пока нет.
   Роль приходит из ?role= или заголовка x-user-role; это и есть точка,
   куда позже подключается проверка токена и загрузка пользователя из БД. */

export interface AuthUser {
  id: string;
  role: Role;
  features: { allowed: Feature[]; blocked: Feature[] };
  boardLimit: number;
}

function fallbackRole(): Role {
  const env = process.env.DEFAULT_ROLE;
  return (ROLES as string[]).includes(env ?? "") ? (env as Role) : "free";
}

export function getAuthUser(request: Request): AuthUser {
  const url = new URL(request.url);
  const raw =
    url.searchParams.get("role") ?? request.headers.get("x-user-role") ?? "";
  const role: Role = (ROLES as string[]).includes(raw)
    ? (raw as Role)
    : fallbackRole();
  return {
    id: `user-${role}`,
    role,
    features: resolveFeatures(role),
    boardLimit: BOARD_LIMITS[role],
  };
}
