/* Серверная часть «Поделок» поверх PostgreSQL + Prisma
   (шаблон для src/lib/catalog-db-server.ts).

   Соответствие старым экспортам src/lib/catalog-db.ts:
     catalogItems        → listCatalogItems()
     findCatalogItem(id) → та же функция, но async
     createCatalogItem() → та же функция, но async
   Поиск дубликата импорта по sourceUrl — findCatalogItemBySourceUrl(). */

import { Prisma } from "@prisma/client";
import type {
  CatalogCategory,
  CatalogDifficulty,
  CatalogItem,
  CatalogSource,
} from "@/lib/catalog-db";
import { sourceNameFromUrl } from "@/lib/catalog-db";
import { prisma } from "@/lib/db-server";

interface CatalogRow {
  id: string;
  title: string;
  category: string;
  sourceUrl: string;
  sourceName: string;
  description: string;
  difficulty: string;
  materials: Prisma.JsonValue;
  instructions: Prisma.JsonValue | null;
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: Prisma.JsonValue;
  createdAt: Date;
}

function toCatalogItem(row: CatalogRow): CatalogItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as CatalogCategory,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName as CatalogSource,
    description: row.description,
    difficulty: row.difficulty as CatalogDifficulty,
    materials: row.materials as unknown as string[],
    instructions:
      row.instructions === null
        ? undefined
        : (row.instructions as unknown as string[]),
    assemblyTime: row.assemblyTime,
    thumbnail: row.thumbnail,
    templateUrl: row.templateUrl,
    tags: row.tags as unknown as string[],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const rows = await prisma.catalogItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toCatalogItem);
}

export async function findCatalogItem(
  id: string
): Promise<CatalogItem | undefined> {
  const row = await prisma.catalogItem.findUnique({ where: { id } });
  return row ? toCatalogItem(row) : undefined;
}

/* Дедупликация импорта: повторная страница-источник не создаёт копию. */
export async function findCatalogItemBySourceUrl(
  sourceUrl: string
): Promise<CatalogItem | undefined> {
  const row = await prisma.catalogItem.findUnique({ where: { sourceUrl } });
  return row ? toCatalogItem(row) : undefined;
}

export async function createCatalogItem(input: {
  title: string;
  category: CatalogCategory;
  sourceUrl: string;
  description: string;
  difficulty: CatalogDifficulty;
  materials: string[];
  instructions?: string[];
  assemblyTime: string;
  thumbnail: string | null;
  templateUrl: string | null;
  tags: string[];
}): Promise<CatalogItem> {
  const row = await prisma.catalogItem.create({
    data: {
      title: input.title,
      category: input.category,
      sourceUrl: input.sourceUrl,
      sourceName: sourceNameFromUrl(input.sourceUrl) ?? "Only Paper",
      description: input.description,
      difficulty: input.difficulty,
      materials: input.materials,
      instructions: input.instructions ?? null,
      assemblyTime: input.assemblyTime,
      thumbnail: input.thumbnail,
      templateUrl: input.templateUrl,
      tags: input.tags,
    },
  });
  return toCatalogItem(row);
}
