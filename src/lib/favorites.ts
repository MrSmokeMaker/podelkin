/* Избранные поделки живут только в localStorage — по спеке, без бэкенда. */
const STORAGE_KEY = "podelki:favorites";

export function readFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function writeFavoriteIds(ids: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* приватный режим или переполнение — избранное просто не сохранится */
  }
}

export function toggleFavoriteId(id: string): string[] {
  const ids = readFavoriteIds();
  const next = ids.includes(id)
    ? ids.filter((value) => value !== id)
    : [id, ...ids];
  writeFavoriteIds(next);
  return next;
}

export function removeFavoriteId(id: string): string[] {
  const next = readFavoriteIds().filter((value) => value !== id);
  writeFavoriteIds(next);
  return next;
}
