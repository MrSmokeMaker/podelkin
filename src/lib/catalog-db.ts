/* Готовая замена src/lib/catalog-db.ts при переходе на PostgreSQL + Prisma.
   Клиентобезопасная часть: константы, типы и sourceNameFromUrl.
   Функции базы — в src/lib/catalog-db-server.ts (шаблон:
   prisma/catalog-db-server.postgres.ts). */

export const CATALOG_CATEGORIES = [
  "бумажная модель",
  "деревянная заготовка",
  "3D-открытка",
  "игрушка",
  "макет",
  "декор",
] as const;

export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

export const CATALOG_SOURCES = ["Only Paper", "1001 Заготовка"] as const;
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
  return null;
}
