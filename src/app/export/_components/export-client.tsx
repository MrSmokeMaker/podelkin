"use client";

import { Download, FileSpreadsheet, FileText, Lock } from "lucide-react";
import { PremiumBadge } from "@/components/premium-badge";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

export function ExportClient() {
  const { has, role } = useFeatureFlags();
  const txtAllowed = has("exportTxt");
  const csvAllowed = has("exportCsv");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Экспорт</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Скачайте данные мастерской: базовая сводка — для всех, детальная
          выгрузка — для Premium
        </p>
      </header>

      <section
        aria-label="Сводка .txt"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-[#55693F]">
            <FileText className="h-6 w-6" aria-hidden />
          </span>
          <span className="rounded-full bg-sage-soft px-3 py-1 text-xs font-semibold text-[#55693F]">
            Все тарифы
          </span>
        </div>
        <h2 className="mt-3 text-lg font-bold">Сводка .txt</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Мастер-классы, средние время и стоимость, запасы, проекты и доски —
          одним текстовым файлом.
        </p>
        {txtAllowed ? (
          <a
            href={`/api/export/summary.txt?role=${role}`}
            download
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" aria-hidden />
            Скачать summary.txt
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled
            className="mt-4 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-ink/10 px-5 py-3 text-sm font-semibold text-ink-soft"
          >
            <Lock className="h-4 w-4" aria-hidden />
            Скачать summary.txt
          </button>
        )}
      </section>

      <section
        aria-label="Детальный .csv"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blush-soft text-[#9C5570]">
            <FileSpreadsheet className="h-6 w-6" aria-hidden />
          </span>
          <PremiumBadge tooltip="Пошаговое время, стоимость материалов и отклонения от плана — на тарифе Premium" />
        </div>
        <h2 className="mt-3 text-lg font-bold">Детальный .csv</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Время по каждому шагу с планом и отклонением, стоимость материалов
          из прайс-бука с датой цены.
        </p>
        {csvAllowed ? (
          <a
            href={`/api/export/detailed.csv?role=${role}`}
            download
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            <Download className="h-4 w-4" aria-hidden />
            Скачать detailed.csv
          </a>
        ) : (
          <>
            <button
              type="button"
              disabled
              aria-disabled
              className="mt-4 flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-ink/10 px-5 py-3 text-sm font-semibold text-ink-soft"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Скачать detailed.csv
            </button>
            <p className="mt-3 rounded-xl bg-sand-soft p-3 text-xs font-medium text-[#8A6A2F]">
              Оформите Premium, чтобы выгружать пошаговое время и стоимость
              материалов.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
