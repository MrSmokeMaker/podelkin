import { NextRequest, NextResponse } from "next/server";
import { countGenerationsToday } from "@/lib/db";
import {
  BOARD_LIMITS,
  GENERATION_LIMITS,
  PROJECT_LIMITS,
} from "@/lib/feature-flags";
import { SESSION_COOKIE, getUserBySessionToken, toPublicUser } from "@/lib/users";

export const dynamic = "force-dynamic";

/* Текущая сессия для клиента. user = null — гость с тарифом «Базовый».
   Infinity в JSON превращается в null: «без лимита». */
function limitToJson(limit: number): number | null {
  return Number.isFinite(limit) ? limit : null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const stored = token ? getUserBySessionToken(token) : null;
  const role = stored?.plan ?? "basic";

  return NextResponse.json({
    user: stored ? toPublicUser(stored) : null,
    role,
    limits: {
      generationsPerDay: GENERATION_LIMITS[role],
      activeProjects: limitToJson(PROJECT_LIMITS[role]),
      boards: limitToJson(BOARD_LIMITS[role]),
    },
    remainingGenerations: Math.max(
      0,
      GENERATION_LIMITS[role] - countGenerationsToday(stored?.id ?? "guest")
    ),
  });
}
