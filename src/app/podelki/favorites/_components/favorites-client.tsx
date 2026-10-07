"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Heart, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { readFavoriteIds, removeFavoriteId } from "@/lib/favorites";
import { useToast } from "@/components/toast";
import { categoryIcon, DIFFICULTY_STYLES } from "../../_components/catalog-visuals";
import type { CatalogItem } from "@/lib/catalog-db";

const SWIPE_THRESHOLD = 90;

function FavoriteCard({
  item,
  onRemove,
}: {
  item: CatalogItem;
  onRemove: (item: CatalogItem) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);

  const finishRemove = () => {
    setRemoving(true);
    window.setTimeout(() => onRemove(item), 180);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    startX.current = event.touches[0].clientX;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (startX.current === null) return;
    const delta = event.touches[0].clientX - startX.current;
    // Свайп только влево; за порогом — сопротивление, чтобы карта не «убегала».
    let next = delta;
    if (delta < -SWIPE_THRESHOLD) {
      next = Math.max(
        -SWIPE_THRESHOLD + (delta + SWIPE_THRESHOLD) / 4,
        -SWIPE_THRESHOLD - 40
      );
    }
    setOffset(Math.min(next, 0));
  };

  const onTouchEnd = () => {
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-360);
      finishRemove();
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  const Icon = categoryIcon(item.category);

  return (
    <li className="relative overflow-hidden rounded-xl bg-clay-soft shadow-card">
      {/* Подложка с «удалить» проступает при свайпе влево */}
      <div className="absolute inset-0 flex items-center justify-end pr-5 text-clay">
        <Trash2 aria-hidden className="h-6 w-6" />
      </div>
      <div
        className={cn(
          "touch-pan-y",
          startX.current === null && "transition-transform duration-150"
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link
          href={`/podelki/${item.id}`}
          className="block bg-white transition-colors hover:bg-paper/60"
        >
          <div className="flex items-stretch gap-3 p-2">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-paper-deep">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={`Превью: ${item.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon aria-hidden className="h-7 w-7 text-clay/50" />
              )}
            </div>
            <div className="min-w-0 flex-1 py-1">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                {item.category}
              </p>
              <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">
                {item.title}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium text-ink",
                    DIFFICULTY_STYLES[item.difficulty]
                  )}
                >
                  {item.difficulty}
                </span>
                {item.assemblyTime && (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                    <Clock aria-hidden className="h-3.5 w-3.5" />
                    {item.assemblyTime}
                  </span>
                )}
              </div>
            </div>
            {/* Кнопка для десктопа: свайпа там нет */}
            <button
              type="button"
              aria-label={`Убрать «${item.title}» из избранного`}
              onClick={finishRemove}
              className="hidden self-center rounded-full p-2 text-ink-soft transition-colors hover:bg-clay-soft hover:text-clay sm:block"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </Link>
      </div>
      {removing && (
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-clay" />
      )}
    </li>
  );
}

export function FavoritesClient() {
  const toast = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setFavoriteIds(readFavoriteIds());
    let cancelled = false;
    fetch("/api/catalog")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ items: CatalogItem[] }>;
      })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onRemove = (item: CatalogItem) => {
    setFavoriteIds(removeFavoriteId(item.id));
    toast("Удалено из избранного", item.title);
  };

  const favorites = items.filter((item) => favoriteIds.includes(item.id));

  return (
    <div className="space-y-5">
      <Link
        href="/podelki"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Каталог поделок
      </Link>

      <header className="flex items-center gap-2">
        <Heart aria-hidden className="h-6 w-6 fill-current text-clay" />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Избранное</h1>
        {status === "ready" && (
          <span className="text-sm text-ink-soft">— {favorites.length}</span>
        )}
      </header>

      {status === "loading" && (
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-white p-8 text-sm text-ink-soft shadow-card ring-1 ring-ink/5">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Загружаем избранное…
        </p>
      )}

      {status === "error" && (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-ink-soft shadow-card ring-1 ring-ink/5">
          Не удалось загрузить список. Обновите страницу.
        </p>
      )}

      {status === "ready" && favorites.length === 0 && (
        <p className="rounded-2xl bg-white p-8 text-center text-ink-soft shadow-card ring-1 ring-ink/5">
          Пока пусто. Нажмите «В избранное» на карточке поделки — она появится здесь.
        </p>
      )}

      {status === "ready" && favorites.length > 0 && (
        <>
          <p className="text-xs text-ink-soft sm:hidden">
            Смахните карточку влево, чтобы убрать
          </p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((item) => (
              <FavoriteCard key={item.id} item={item} onRemove={onRemove} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
