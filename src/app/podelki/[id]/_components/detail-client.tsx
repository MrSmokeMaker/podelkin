"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  ExternalLink,
  Heart,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readFavoriteIds, toggleFavoriteId } from "@/lib/favorites";
import { useToast } from "@/components/toast";
import { categoryIcon, DIFFICULTY_STYLES } from "../../_components/catalog-visuals";
import type { CatalogItem } from "@/lib/catalog-db";

export function DetailClient({ item }: { item: CatalogItem }) {
  const toast = useToast();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(readFavoriteIds().includes(item.id));
  }, [item.id]);

  const onToggleFavorite = () => {
    const ids = toggleFavoriteId(item.id);
    const nowFavorite = ids.includes(item.id);
    setIsFavorite(nowFavorite);
    toast(nowFavorite ? "Добавлено в избранное" : "Удалено из избранного", item.title);
  };

  const onShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: item.title,
          text: item.description || item.title,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Ссылка скопирована", "«Поделиться» здесь недоступно — ссылка в буфере обмена");
    } catch {
      toast("Не удалось поделиться", "Скопируйте адрес страницы из строки браузера");
    }
  };

  const Icon = categoryIcon(item.category);

  return (
    <div className="space-y-5">
      <Link
        href="/podelki"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Каталог поделок
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/5">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={`Превью: ${item.title}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <Icon aria-hidden className="h-20 w-20 text-clay/40" />
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {item.category}
            </p>
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {item.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold text-ink",
                DIFFICULTY_STYLES[item.difficulty]
              )}
            >
              {item.difficulty}
            </span>
            {item.assemblyTime && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 text-xs font-medium text-ink">
                <Clock aria-hidden className="h-3.5 w-3.5" />
                {item.assemblyTime}
              </span>
            )}
            <span className="rounded-full bg-mist-soft px-3 py-1 text-xs font-medium text-ink">
              {item.sourceName}
            </span>
          </div>

          {item.description && (
            <p className="text-sm leading-relaxed text-ink">{item.description}</p>
          )}

          {item.instructions && item.instructions.length > 0 && (
            <section aria-labelledby="podelka-instructions">
              <h2
                id="podelka-instructions"
                className="text-sm font-semibold uppercase tracking-wide text-ink-soft"
              >
                Инструкция
              </h2>
              <ol className="mt-2 space-y-2.5">
                {item.instructions.map((step, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clay-soft text-[11px] font-bold text-[#8A4A2C]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {item.materials.length > 0 && (
            <section aria-labelledby="podelka-materials">
              <h2
                id="podelka-materials"
                className="text-sm font-semibold uppercase tracking-wide text-ink-soft"
              >
                Материалы
              </h2>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {item.materials.map((material) => (
                  <li key={material} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sage-soft">
                      <Check aria-hidden className="h-3 w-3 text-ink" />
                    </span>
                    {material}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {item.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Теги">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-paper-deep px-2.5 py-0.5 text-xs text-ink-soft"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={isFavorite}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-colors",
                isFavorite
                  ? "bg-clay text-white hover:bg-clay/90"
                  : "bg-white text-ink ring-1 ring-ink/10 hover:bg-clay-soft"
              )}
            >
              <Heart
                aria-hidden
                className={cn("h-4 w-4", isFavorite && "fill-current")}
              />
              {isFavorite ? "В избранном" : "В избранное"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition-colors hover:bg-paper-deep"
            >
              <Share2 aria-hidden className="h-4 w-4" />
              Поделиться
            </button>
          </div>

          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay hover:underline"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Открыть оригинал на {item.sourceName}
            </a>
            {item.templateUrl ? (
              <a
                href={item.templateUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper transition-opacity hover:opacity-90"
              >
                <Download aria-hidden className="h-4 w-4" />
                Скачать шаблон
              </a>
            ) : (
              <p className="text-xs text-ink-soft">Шаблон к этой поделке не приложен</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
