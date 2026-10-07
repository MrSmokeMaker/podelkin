/* Статическая карта тарифов: роль → набор возможностей.
   Единый источник правды для сервера (API-гейтинг) и клиента (useFeatureFlags).
   При подключении реальной аутентификации карта переезжает в БД,
   контракт { allowed, blocked } сохраняется. */

export type Role = "free" | "premium" | "admin";

export type Feature =
  | "search"
  | "viewCrafts"
  | "makerMode"
  | "basicStats"
  | "saveProject"
  | "exportTxt"
  | "advancedStats"
  | "exportCsv"
  | "offlineSync"
  | "prioritySupport"
  | "unlimitedProjects"
  | "customBoards"
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
  "offlineSync",
  "prioritySupport",
  "unlimitedProjects",
  "customBoards",
  "seedControl",
];

export const ROLE_FEATURES: Record<Role, Feature[]> = {
  free: ["search", "viewCrafts", "makerMode", "basicStats", "saveProject", "exportTxt"],
  premium: [
    "search",
    "viewCrafts",
    "makerMode",
    "basicStats",
    "saveProject",
    "exportTxt",
    "advancedStats",
    "exportCsv",
    "offlineSync",
    "prioritySupport",
    "unlimitedProjects",
    "customBoards",
  ],
  admin: ALL_FEATURES,
};

export const ROLES: Role[] = ["free", "premium", "admin"];

export const BOARD_LIMITS: Record<Role, number> = { free: 3, premium: 20, admin: 20 };

/* Демо-роль клиента, пока нет реальной сессии. Меняется через localStorage
   (ключ ROLE_STORAGE_KEY) — в проде заменится ролью из API. */
export const DEFAULT_ROLE: Role = "free";
export const ROLE_STORAGE_KEY = "rukodelie-role";

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
