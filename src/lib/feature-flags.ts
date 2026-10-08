/* Карта тарифов: роль → набор возможностей и лимиты.
   Единый источник правды для сервера (API-гейтинг) и клиента (useFeatureFlags).
   Пользователь и его тариф живут в сессии (src/lib/users.ts); гость = «Базовый». */

export type Role = "basic" | "premium" | "director";

export type Feature =
  | "search"
  | "viewCrafts"
  | "makerMode"
  | "basicStats"
  | "saveProject"
  | "exportTxt"
  | "advancedStats"
  | "exportCsv"
  | "extendedProjects"
  | "customBoards"
  | "offlineSync"
  | "prioritySupport"
  | "unlimitedProjects"
  | "exportJson"
  | "aiInsights"
  | "seedControl";

export const ALL_FEATURES: Feature[] = [
  "search",
  "viewCrafts",
  "makerMode",
  "basicStats",
  "saveProject",
  "exportTxt",
  "advancedStats",
  "exportCsv",
  "extendedProjects",
  "customBoards",
  "offlineSync",
  "prioritySupport",
  "unlimitedProjects",
  "exportJson",
  "aiInsights",
  "seedControl",
];

export const ROLE_FEATURES: Record<Role, Feature[]> = {
  basic: ["search", "viewCrafts", "makerMode", "basicStats", "saveProject", "exportTxt"],
  premium: [
    "search",
    "viewCrafts",
    "makerMode",
    "basicStats",
    "saveProject",
    "exportTxt",
    "advancedStats",
    "exportCsv",
    "extendedProjects",
    "customBoards",
    "offlineSync",
    "prioritySupport",
  ],
  director: ALL_FEATURES,
};

export const ROLES: Role[] = ["basic", "premium", "director"];

export const PLAN_LABELS: Record<Role, string> = {
  basic: "Базовый",
  premium: "Премиум",
  director: "Директор",
};

export const PLAN_PRICES: Record<Role, number> = {
  basic: 0,
  premium: 299,
  director: 990,
};

/* Еженедельная подписка: короткий формат для платных тарифов —
   15 поделок (ИИ-генераций) в неделю, оплата раз в неделю. */
export type PlanPeriod = "month" | "week";

export const WEEKLY_CRAFTS = 15;

export const WEEKLY_PRICES: Record<Role, number> = {
  basic: 0,
  premium: 99,
  director: 249,
};

/* Порядок тарифов для сравнения «апгрейд или даунгрейд». */
export const PLAN_RANK: Record<Role, number> = { basic: 0, premium: 1, director: 2 };

/* Лимиты тарифов. Infinity = «без лимита» (в JSON отдаётся как null). */
export const BOARD_LIMITS: Record<Role, number> = { basic: 3, premium: 20, director: 100 };
export const PROJECT_LIMITS: Record<Role, number> = {
  basic: 3,
  premium: 10,
  director: Number.POSITIVE_INFINITY,
};
/* Генерация поделок есть во всех тарифах — отличается только дневная квота. */
export const GENERATION_LIMITS: Record<Role, number> = {
  basic: 3,
  premium: 15,
  director: 60,
};

export const DEFAULT_ROLE: Role = "basic";

export function resolveFeatures(role: Role): {
  allowed: Feature[];
  blocked: Feature[];
} {
  const allowed = ROLE_FEATURES[role];
  return {
    allowed,
    blocked: ALL_FEATURES.filter((feature) => !allowed.includes(feature)),
  };
}

/* «3», «20», «∞» — для интерфейса тарифов. */
export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "∞";
}
