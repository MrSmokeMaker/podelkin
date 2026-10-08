"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, ShoppingCart, Trash2, X } from "lucide-react";
import { useToast } from "@/components/toast";
import { ProgressBar } from "@/components/progress";
import { formatQty, formatRub } from "@/lib/crafts";
import {
  clearBoughtShoppingItems,
  clearShoppingList,
  estimateTotal,
  removeShoppingItem,
  shoppingListText,
  subscribeShoppingList,
  toggleShoppingItemBought,
  type ShoppingItem,
} from "@/lib/shopping-list";
import { cn } from "@/lib/utils";

function qtyText(item: ShoppingItem): string | null {
  if (item.qty == null) return null;
  return `${formatQty(item.qty)}${item.unit ? ` ${item.unit}` : ""}`;
}

/* Порядок групп — по первому появлению источника в списке. */
function groupBySource(items: ShoppingItem[]): { source: string; items: ShoppingItem[] }[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const key = item.source ?? "Без источника";
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      groups.set(key, [item]);
    }
  }
  return Array.from(groups.entries()).map(([source, groupItems]) => ({
    source,
    items: groupItems,
  }));
}

function downloadText(text: string): boolean {
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spisok-pokupok.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

/* Вычёркивание: линия поверх названия растёт слева направо, текст и цена
   гаснут, галочка «вспыхивает» (animate-check-pop в globals.css). */
function ShoppingRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const qty = qtyText(item);
  return (
    <li className="flex items-center gap-3 py-3">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-pressed={item.bought}
        aria-label={item.bought ? `Вернуть в покупки: ${item.name}` : `Отметить купленным: ${item.name}`}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 active:scale-95",
          item.bought
            ? "border-sage bg-sage text-white animate-check-pop"
            : "border-ink/25 text-transparent hover:border-clay hover:text-clay"
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold transition-colors duration-500",
            item.bought && "text-ink-soft"
          )}
        >
          <span className="relative inline-block max-w-full align-bottom">
            {item.name}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-0 top-1/2 h-[1.5px] w-full origin-left -translate-y-1/2 rounded-full bg-ink-soft/80 transition-transform duration-500 ease-out",
                item.bought ? "scale-x-100" : "scale-x-0"
              )}
            />
          </span>
        </p>
        {item.source && (
          <p className="truncate text-xs text-ink-soft">{item.source}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {qty && (
          <p
            className={cn(
              "text-sm font-semibold text-[#8A4A2C] transition-colors duration-500",
              item.bought && "text-ink-soft line-through"
            )}
          >
            {qty}
          </p>
        )}
        {item.qty != null && item.price != null && (
          <p
            className={cn(
              "text-xs text-ink-soft transition-opacity duration-500",
              item.bought && "opacity-60"
            )}
          >
            {formatRub(item.qty * item.price)}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Удалить из списка: ${item.name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-red-50 hover:text-red-700 active:scale-95"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </li>
  );
}

export function ShoppingListClient() {
  const showToast = useToast();
  const [items, setItems] = useState<ShoppingItem[] | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribeShoppingList(setItems), []);

  if (items === null) {
    return <p className="animate-pulse text-sm text-ink-soft">Загружаем список…</p>;
  }

  const toBuy = items.filter((item) => !item.bought);
  const bought = items.filter((item) => item.bought);
  const total = estimateTotal(items);

  const onCopy = async () => {
    const text = shoppingListText(items);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Скопировано в буфер обмена", text);
    } catch {
      showToast("Список покупок", text);
    }
  };

  const onExport = () => {
    const text = shoppingListText(items);
    if (downloadText(text)) {
      showToast("Файл .txt сохранён", text);
    } else {
      showToast("Список покупок", text);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="inline-flex min-h-8 items-center rounded-full bg-clay-soft px-3 py-1.5 text-[#8A4A2C]">
          К покупке: {toBuy.length}
        </span>
        {bought.length > 0 && (
          <span className="inline-flex min-h-8 items-center rounded-full bg-sage-soft px-3 py-1.5 text-[#55693F]">
            Куплено: {bought.length}
          </span>
        )}
        {total > 0 && (
          <span className="inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1.5 ring-1 ring-ink/10">
            Примерно: {formatRub(total)}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-ink/5">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-soft text-[#8A4A2C]">
            <ShoppingCart className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 font-bold">Список наполнится сам</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Сгенерируйте поделку, добавьте её из источника или создайте свою —
            материалы попадут сюда автоматически. Низкие остатки можно скинуть
            из запасов.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/generate"
              className="inline-flex min-h-11 items-center rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              Сгенерировать поделку
            </Link>
            <Link
              href="/inventory"
              className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
            >
              Перейти в запасы
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section
            aria-label="Прогресс покупок"
            className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
          >
            <ProgressBar
              value={bought.length}
              max={items.length}
              label={`Куплено ${bought.length} из ${items.length}`}
            />
          </section>

          <section
            aria-label="К покупке"
            className="rounded-2xl bg-white px-5 py-2 shadow-card ring-1 ring-ink/5"
          >
            {toBuy.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm font-medium text-[#55693F]">
                <Check className="h-5 w-5 shrink-0" aria-hidden />
                Всё куплено — по списку больше ничего не нужно.
              </p>
            ) : (
              groupBySource(toBuy).map((group, groupIndex) => (
                <div
                  key={group.source}
                  className={cn(groupIndex > 0 && "border-t border-dashed border-ink/10")}
                >
                  <h3 className="flex items-center gap-2 pt-3 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                    {group.source}
                    <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-semibold normal-case">
                      {group.items.length}
                    </span>
                  </h3>
                  <ul className="divide-y divide-ink/5">
                    {group.items.map((item) => (
                      <ShoppingRow
                        key={item.id}
                        item={item}
                        onToggle={(id) => setItems(toggleShoppingItemBought(id))}
                        onRemove={(id) => setItems(removeShoppingItem(id))}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>

          {bought.length > 0 && (
            <section
              aria-label="Уже куплено"
              className="rounded-2xl bg-white/70 px-5 py-2 shadow-card ring-1 ring-ink/5"
            >
              <div className="flex items-center justify-between gap-3 pt-3">
                <h2 className="text-sm font-bold text-ink-soft">Уже куплено</h2>
                <button
                  type="button"
                  onClick={() => setItems(clearBoughtShoppingItems())}
                  className="min-h-9 rounded-xl px-3 text-xs font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink active:scale-95"
                >
                  Убрать купленные
                </button>
              </div>
              <ul className="divide-y divide-ink/5">
                {bought.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={(id) => setItems(toggleShoppingItemBought(id))}
                    onRemove={(id) => setItems(removeShoppingItem(id))}
                  />
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExport}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] sm:flex-none"
            >
              <Download className="h-4 w-4" aria-hidden />
              Экспорт в .txt
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
            >
              <Check
                className={cn("h-4 w-4 text-[#55693F]", !copied && "hidden")}
                aria-hidden
              />
              <Copy className={cn("h-4 w-4", copied && "hidden")} aria-hidden />
              {copied ? "Скопировано" : "Скопировать"}
            </button>
            <button
              type="button"
              onClick={() => setItems(clearShoppingList())}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-soft shadow-card ring-1 ring-ink/10 transition hover:bg-red-50 hover:text-red-700 active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Очистить всё
            </button>
          </div>
        </>
      )}
    </div>
  );
}
