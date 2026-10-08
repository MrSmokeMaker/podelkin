"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { formatQty, formatRub } from "@/lib/crafts";
import {
  addShoppingItems,
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
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-95",
          item.bought
            ? "border-sage bg-sage text-white"
            : "border-ink/25 text-transparent hover:border-clay hover:text-clay"
        )}
      >
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            item.bought && "text-ink-soft line-through"
          )}
        >
          {item.name}
        </p>
        {item.source && (
          <p className="truncate text-xs text-ink-soft">{item.source}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        {qty && (
          <p
            className={cn(
              "text-sm font-semibold text-[#8A4A2C]",
              item.bought && "text-ink-soft line-through"
            )}
          >
            {qty}
          </p>
        )}
        {item.qty != null && item.price != null && (
          <p className="text-xs text-ink-soft">{formatRub(item.qty * item.price)}</p>
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
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("шт");

  useEffect(() => subscribeShoppingList(setItems), []);

  if (items === null) {
    return <p className="animate-pulse text-sm text-ink-soft">Загружаем список…</p>;
  }

  const toBuy = items.filter((item) => !item.bought);
  const bought = items.filter((item) => item.bought);
  const total = estimateTotal(items);

  const onAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedQty = qty.trim() ? Number(qty.replace(",", ".")) : null;
    addShoppingItems([
      {
        name: trimmed,
        qty: parsedQty != null && Number.isFinite(parsedQty) ? parsedQty : null,
        unit: unit.trim() || null,
      },
    ]);
    setName("");
    setQty("");
    setUnit("шт");
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

      <form
        className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 sm:flex-row"
        onSubmit={onAdd}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Что купить: например «Глина красная»"
          maxLength={60}
          aria-label="Название товара"
          className="min-h-12 flex-1 rounded-xl border border-ink/10 bg-paper px-4 text-sm outline-none transition focus:border-clay"
        />
        <input
          value={qty}
          onChange={(event) => setQty(event.target.value)}
          placeholder="Кол-во"
          inputMode="decimal"
          maxLength={8}
          aria-label="Количество"
          className="min-h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm outline-none transition focus:border-clay sm:w-24"
        />
        <input
          value={unit}
          onChange={(event) => setUnit(event.target.value)}
          placeholder="ед."
          maxLength={10}
          aria-label="Единица измерения"
          className="min-h-12 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm outline-none transition focus:border-clay sm:w-24"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Добавить
        </button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-card ring-1 ring-ink/5">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-clay-soft text-[#8A4A2C]">
            <ShoppingCart className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 font-bold">Список пока пуст</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
            Добавьте позицию вручную или отправьте сюда низкие остатки из запасов
            и недостающие материалы поделки.
          </p>
          <Link
            href="/inventory"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            Перейти в запасы
          </Link>
        </div>
      ) : (
        <>
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
              <ul className="divide-y divide-ink/5">
                {toBuy.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    onToggle={(id) => setItems(toggleShoppingItemBought(id))}
                    onRemove={(id) => setItems(removeShoppingItem(id))}
                  />
                ))}
              </ul>
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
