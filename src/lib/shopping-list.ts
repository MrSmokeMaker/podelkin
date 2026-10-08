/* Общий список покупок клиента: localStorage + custom event, чтобы шапка,
   запасы и страницы поделок видели один и тот же список без бэкенда. */

import { formatQty, formatRub } from "@/lib/crafts";

export interface ShoppingEntry {
  name: string;
  qty?: number | null;
  unit?: string | null;
  /* Цена за единицу — если известна, по ней считаем примерную сумму. */
  price?: number | null;
  source?: string | null;
}

export interface ShoppingItem extends ShoppingEntry {
  id: string;
  bought: boolean;
}

export const SHOPPING_STORAGE_KEY = "rukodelie-shopping-list";

const SHOPPING_EVENT = "rukodelie:shopping-list";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isShoppingItem(value: unknown): value is ShoppingItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" && item.name.trim().length > 0;
}

export function readShoppingList(): ShoppingItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SHOPPING_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isShoppingItem);
  } catch {
    return [];
  }
}

function writeShoppingList(items: ShoppingItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(SHOPPING_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* приватный режим — список просто не сохранится */
  }
  window.dispatchEvent(new CustomEvent(SHOPPING_EVENT));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Дубликаты схлопываются по названию; если у обеих позиций есть количество —
   суммируем (например, материал нужен на два проекта). */
export function addShoppingItems(entries: ShoppingEntry[]): {
  items: ShoppingItem[];
  added: number;
} {
  const items = readShoppingList();
  const byKey = new Map(items.map((item) => [normalizeName(item.name), item]));
  let added = 0;

  for (const entry of entries) {
    const name = entry.name.trim();
    if (!name) continue;
    const existing = byKey.get(normalizeName(name));
    if (existing) {
      if (existing.qty != null && entry.qty != null) {
        existing.qty = existing.qty + entry.qty;
      }
      continue;
    }
    byKey.set(normalizeName(name), {
      id: makeId(),
      name,
      qty: entry.qty ?? null,
      unit: entry.unit ?? null,
      price: entry.price ?? null,
      source: entry.source ?? null,
      bought: false,
    });
    added += 1;
  }

  const next = Array.from(byKey.values());
  writeShoppingList(next);
  return { items: next, added };
}

export function toggleShoppingItemBought(id: string): ShoppingItem[] {
  const next = readShoppingList().map((item) =>
    item.id === id ? { ...item, bought: !item.bought } : item
  );
  writeShoppingList(next);
  return next;
}

export function removeShoppingItem(id: string): ShoppingItem[] {
  const next = readShoppingList().filter((item) => item.id !== id);
  writeShoppingList(next);
  return next;
}

export function clearBoughtShoppingItems(): ShoppingItem[] {
  const next = readShoppingList().filter((item) => !item.bought);
  writeShoppingList(next);
  return next;
}

export function clearShoppingList(): ShoppingItem[] {
  writeShoppingList([]);
  return [];
}

/* Подписка на изменения: свой event + storage (другие вкладки).
   Сразу отдаёт текущий список, возвращает функцию отписки. */
export function subscribeShoppingList(
  callback: (items: ShoppingItem[]) => void
): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => callback(readShoppingList());
  window.addEventListener(SHOPPING_EVENT, handler);
  window.addEventListener("storage", handler);
  handler();
  return () => {
    window.removeEventListener(SHOPPING_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function shoppingListText(items: ShoppingItem[]): string {
  const toBuy = items.filter((item) => !item.bought);
  const lines = ["Список покупок — Podelkin", ""];
  if (toBuy.length === 0) {
    lines.push("Список пуст — всё куплено!");
    return lines.join("\n");
  }
  for (const item of toBuy) {
    const qty =
      item.qty != null
        ? `${formatQty(item.qty)}${item.unit ? ` ${item.unit}` : ""}`
        : "";
    const source = item.source ? ` (${item.source})` : "";
    lines.push(`• ${item.name}${qty ? ` — ${qty}` : ""}${source}`);
  }
  const total = estimateTotal(items);
  if (total > 0) {
    lines.push("", `Примерная сумма: ${formatRub(total)}`);
  }
  return lines.join("\n");
}

/* Считаем только позиции, которые ещё не куплены. */
export function estimateTotal(items: ShoppingItem[]): number {
  return items.reduce(
    (sum, item) =>
      item.bought || item.qty == null || item.price == null
        ? sum
        : sum + item.qty * item.price,
    0
  );
}
