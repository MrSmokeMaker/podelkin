"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Database, Image as ImageIcon, MessageSquare, Lock } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

interface AiStatsDto {
  llmCalls: number;
  imageRenders: number;
  cacheHits: number;
  cacheMisses: number;
  hitsRatio: number;
  remainingImageQuota: number;
}

/* ИИ-аналитика — возможность тарифа «Директор» (aiInsights).
   Остальные тарифы видят замок и ссылку на тарифы. */
export function AiInsights() {
  const { has } = useFeatureFlags();
  const allowed = has("aiInsights");
  const [stats, setStats] = useState<AiStatsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    fetch("/api/stats/ai", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Нет данных");
        else setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("Ошибка сети");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <section
        aria-label="Аналитика ИИ"
        className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist-soft text-[#4A6D8C]">
            <Bot className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Аналитика ИИ-генераций</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-mist-soft px-2.5 py-1 text-[11px] font-bold text-[#4A6D8C]">
                <Lock className="h-3 w-3" aria-hidden />
                Директор
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              Вызовы LLM, попадания в кэш, рендеры картинок и остаток квоты —
              весь контур генерации под контролем.
            </p>
            <Link
              href="/billing"
              className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-clay px-4 py-2 text-xs font-bold text-paper transition hover:bg-[#B06A48]"
            >
              Открыть тариф «Директор»
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const cards = [
    {
      icon: MessageSquare,
      tint: "bg-clay-soft text-[#8A4A2C]",
      label: "Вызовы LLM",
      value: stats ? String(stats.llmCalls) : "…",
    },
    {
      icon: ImageIcon,
      tint: "bg-blush-soft text-[#9C5570]",
      label: "Рендеры картинок",
      value: stats ? String(stats.imageRenders) : "…",
    },
    {
      icon: Database,
      tint: "bg-sage-soft text-[#55693F]",
      label: "Попадания в кэш",
      value: stats ? `${stats.cacheHits} (${Math.round(stats.hitsRatio * 100)}%)` : "…",
    },
    {
      icon: Bot,
      tint: "bg-mist-soft text-[#4A6D8C]",
      label: "Остаток квоты картинок",
      value: stats ? String(stats.remainingImageQuota) : "…",
    },
  ];

  return (
    <section aria-label="Аналитика ИИ">
      <h2 className="text-lg font-bold">Аналитика ИИ-генераций</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Телеметрия контура генерации — доступна на тарифе «Директор»
      </p>
      {error && (
        <p className="mt-4 rounded-2xl bg-white p-5 text-sm font-medium text-[#9C5570] ring-1 ring-ink/5">
          {error}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ icon: Icon, tint, label, value }) => (
          <div
            key={label}
            className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
          >
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${tint}`}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                {label}
              </p>
              <p className="mt-1 truncate text-xl font-bold sm:text-2xl">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
