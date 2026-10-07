import type { Category, Craft, Difficulty } from "@/data/mockData";
import { crafts, synonyms } from "@/lib/db";
import { collectCost } from "@/lib/cost-calculator";
import { craftMinutes } from "@/lib/crafts";

/* Поисковый конвейер: нормализация (ё→е, нижний регистр, без пунктуации),
   расширение синонимов, ранжирование по полям. Заменяет tsvector + trigram
   в среде без PostgreSQL — тот же контракт, simpler fallback. */

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(query: string): string[] {
  return normalizeText(query).split(" ").filter((t) => t.length > 1);
}

export function expandTokens(tokens: string[]): string[] {
  const result = new Set(tokens);
  for (const token of tokens) {
    for (const synonym of synonyms) {
      if (normalizeText(synonym.query) === token) {
        for (const part of tokenize(synonym.target)) {
          result.add(part);
        }
      }
    }
  }
  return [...result];
}

export type SortMode = "relevance" | "time" | "cost";

export interface SearchFacets {
  categories: { name: Category; count: number }[];
  difficulties: { name: Difficulty; count: number }[];
}

export interface SerializedCraft extends Craft {
  minutes: number;
  baseCost: number;
  missingPrices: string[];
}

function includesToken(haystack: string, token: string): boolean {
  return normalizeText(haystack).includes(token);
}

function scoreCraft(craft: Craft, tokens: string[]): number {
  let score = 0;
  for (const token of tokens) {
    if (includesToken(craft.title, token)) score += 5;
    if (includesToken(craft.category, token)) score += 4;
    if (craft.materials.some((m) => includesToken(m.name, token))) score += 3;
    if (craft.tools.some((t) => includesToken(t, token))) score += 2;
    if (includesToken(craft.description, token)) score += 1;
    if (
      craft.steps.some(
        (s) => includesToken(s.title, token) || includesToken(s.description, token)
      )
    ) {
      score += 1;
    }
  }
  return score;
}

export interface SearchParams {
  q?: string;
  category?: string;
  difficulty?: string;
  maxTimeMin?: number;
  sort?: SortMode;
}

export interface SearchResponse {
  total: number;
  results: SerializedCraft[];
  facets: SearchFacets;
}

export function searchCrafts(params: SearchParams): SearchResponse {
  const tokens = expandTokens(tokenize(params.q ?? ""));

  /* Фасеты считаются по текстовому совпадению, до фильтров категории/сложности.
     Пустой запрос возвращает весь каталог. */
  const matched =
    tokens.length === 0
      ? crafts.map((craft) => ({ craft, score: 0 }))
      : crafts
          .map((craft) => ({ craft, score: scoreCraft(craft, tokens) }))
          .filter((entry) => entry.score > 0);

  const facets: SearchFacets = {
    categories: countBy(matched.map((e) => e.craft.category)),
    difficulties: countBy(matched.map((e) => e.craft.difficulty)),
  };

  let entries = matched.filter((entry) => {
    const { craft } = entry;
    if (params.category && craft.category !== params.category) return false;
    if (params.difficulty && craft.difficulty !== params.difficulty) return false;
    if (
      params.maxTimeMin !== undefined &&
      craftMinutes(craft) > params.maxTimeMin
    ) {
      return false;
    }
    return true;
  });

  const sort = params.sort ?? "relevance";
  entries = [...entries].sort((a, b) => {
    if (sort === "time") return craftMinutes(a.craft) - craftMinutes(b.craft);
    if (sort === "cost") return collectCost(a.craft).baseCost - collectCost(b.craft).baseCost;
    return b.score - a.score;
  });

  const results = entries.map(({ craft }) => serializeCraft(craft));
  return { total: results.length, results, facets };
}

export function serializeCraft(craft: Craft): SerializedCraft {
  const cost = collectCost(craft);
  return {
    ...craft,
    minutes: craftMinutes(craft),
    baseCost: cost.baseCost,
    missingPrices: cost.missingPrices,
  };
}

function countBy<T extends string>(values: T[]): { name: T; count: number }[] {
  const map = new Map<T, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
