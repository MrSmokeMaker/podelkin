"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BOARD_LIMITS,
  DEFAULT_ROLE,
  ROLES,
  ROLE_STORAGE_KEY,
  resolveFeatures,
  type Feature,
  type Role,
} from "@/lib/feature-flags";

/* Клиентский доступ к фича-флагам: статическая карта тарифов из
   src/lib/feature-flags.ts + демо-роль из localStorage. Когда появится
   реальный API, чтение роли заменится на запрос сессии — контракт хука
   (role / allowed / blocked / has / boardLimit) не изменится. */

export function useFeatureFlags() {
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);

  useEffect(() => {
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    if (stored && (ROLES as string[]).includes(stored)) {
      setRole(stored as Role);
    }
  }, []);

  const flags = useMemo(() => resolveFeatures(role), [role]);

  const has = (feature: Feature) => flags.allowed.includes(feature);

  return {
    role,
    allowed: flags.allowed,
    blocked: flags.blocked,
    has,
    boardLimit: BOARD_LIMITS[role],
    isPremium: role !== "free",
  };
}
