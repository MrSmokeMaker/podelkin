"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, PartyPopper, X } from "lucide-react";
import { ProgressBar } from "@/components/progress";
import { Stopwatch } from "@/components/stopwatch";
import { categoryIcon } from "../../_components/catalog-visuals";
import type { CatalogItem } from "@/lib/catalog-db";

/* Пошаговый режим мастера для поделки из каталога: один шаг на экран,
   секундомер на каждый шаг, прогресс и финальный экран. Открывается
   поверх страницы поделки — отдельный маршрут не нужен. */
export function MasterModeOverlay({
  item,
  onClose,
}: {
  item: CatalogItem;
  onClose: () => void;
}) {
  const steps = item.instructions ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const total = steps.length;
  const finished = stepIndex >= total;
  const step = steps[Math.min(stepIndex, total - 1)];
  const completedCount = done.filter(Boolean).length;
  const Icon = categoryIcon(item.category);

  const goNext = () => {
    setDone((d) => d.map((v, i) => (i === stepIndex ? true : v)));
    setStepIndex((i) => Math.min(i + 1, total));
  };

  const restart = () => {
    setStepIndex(0);
    setDone(steps.map(() => false));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Режим мастера: ${item.title}`}
      className="fixed inset-0 z-50 overflow-y-auto bg-paper"
    >
      <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink shadow-card ring-1 ring-ink/5 transition active:scale-95"
            aria-label="Закрыть режим мастера"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
              Режим мастера
            </p>
            <h2 className="truncate text-lg font-bold">{item.title}</h2>
          </div>
          <span className="flex h-11 items-center rounded-xl bg-white px-3 text-sm font-semibold text-ink-soft shadow-card ring-1 ring-ink/5">
            {finished ? total : stepIndex + 1}/{total}
          </span>
        </header>

        <ProgressBar value={finished ? total : completedCount} max={total} />

        {!finished ? (
          <>
            <section
              aria-label={`Шаг ${stepIndex + 1}`}
              className="rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink/5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-clay">
                <Clock className="h-4 w-4" />
                Шаг {stepIndex + 1} из {total}
              </p>
              <p className="mt-3 text-xl font-bold leading-snug sm:text-2xl">
                {step}
              </p>

              {item.materials.length > 0 && (
                <div className="mt-5 rounded-2xl bg-paper-deep/60 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Материалы под рукой
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {item.materials.map((material) => (
                      <li
                        key={material}
                        className="rounded-full bg-white px-3 py-1.5 text-sm font-medium"
                      >
                        {material}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <Stopwatch key={stepIndex} stepTitle={`шаг ${stepIndex + 1}`} />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition enabled:hover:bg-paper-deep enabled:active:scale-[0.98] disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex min-h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-clay text-sm font-semibold text-paper shadow-soft transition hover:bg-[#B06A48] active:scale-[0.98]"
              >
                <CheckCircle2 className="h-5 w-5" />
                Готово, дальше
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <section className="rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink/5">
            <div className="mx-auto flex max-w-sm aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-paper-deep shadow-card ring-1 ring-ink/5">
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={`Готовая поделка: ${item.title}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon aria-hidden className="h-16 w-16 text-clay/50" />
              )}
            </div>
            <span className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-[#55693F]">
              <PartyPopper className="h-8 w-8" />
            </span>
            <h3 className="mt-4 text-2xl font-bold">Готово!</h3>
            <p className="mt-2 text-ink-soft">
              Все {total} шагов поделки «{item.title}» пройдены.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-12 items-center justify-center rounded-xl bg-clay px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
              >
                Вернуться к поделке
              </button>
              <button
                type="button"
                onClick={restart}
                className="flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
              >
                Пройти заново
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
