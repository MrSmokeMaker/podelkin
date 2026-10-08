"use client";

import { useMemo } from "react";
import { useSession } from "@/components/session-provider";
import {
  BOARD_LIMITS,
  GENERATION_LIMITS,
  PROJECT_LIMITS,
  resolveFeatures,
  type Feature,
  type Role,
} from "@/lib/feature-flags";

/* Тариф берётся из сессии (/api/auth/me через SessionProvider), а не из
   localStorage: роль меняется на сервере при оплате. Пока сессия грузится,
   действует «Базовый» — как у гостя. */

export function useFeatureFlags() {
  const { role } = useSession();

  const flags = useMemo(() => resolveFeatures(role), [role]);

  const has = (feature: Feature) => flags.allowed.includes(feature);

  return {
    role: role as Role,
    allowed: flags.allowed,
    blocked: flags.blocked,
    has,
    boardLimit: BOARD_LIMITS[role],
    projectLimit: PROJECT_LIMITS[role],
    generationLimit: GENERATION_LIMITS[role],
    isPremium: role !== "basic",
  };
}
