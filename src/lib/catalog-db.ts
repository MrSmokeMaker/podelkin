/* Клиентобезопасная часть каталога: категории, источники и типы */

export const CATALOG_CATEGORIES = [
  "бумажная модель",
  "деревянная заготовка",
  "3D-открытка",
  "игрушка",
  "макет",
  "декор",
  "своими руками",
  "самоделка",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export const CATALOG_SOURCES = [
  "Only Paper",
  "1001 Заготовка",
  "Своими Руками",
  "Сделай Сам",
] as const;
export type CatalogSource = (typeof CATALOG_SOURCES)[number];

export const CATALOG_DIFFICULTIES = ["легко", "средне", "сложно"] as const;
export type CatalogDifficulty = (typeof CATALOG_DIFFICULTIES)[number];

export interface CatalogItem {
  id: string;
  title: string;
  category: CatalogCategory;
  sourceUrl: string;
  sourceName: CatalogSource;
  description: string;
  difficulty: CatalogDifficulty;
  materials: string[];
  instructions?: string[];
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: string[];
  createdAt: string;
}

/* sourceName подставляется по домену sourceUrl. */
export function sourceNameFromUrl(url: string): CatalogSource | null {
  const lower = url.toLowerCase();
  if (lower.includes("only-paper.ru")) return "Only Paper";
  if (lower.includes("1001zagotovka.ru")) return "1001 Заготовка";
  if (lower.includes("svoimirukamy.com")) return "Своими Руками";
  if (lower.includes("sdelaysam-svoimirukami.ru")) return "Сделай Сам";
  return null;
}
