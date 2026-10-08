"use client";

import { useState } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenerateCraft } from "./generate-craft";
import { NewPodelkaClient } from "../../podelki/_components/new-podelka-form";

const TABS = [
  { key: "ai", label: "С помощью ИИ", icon: Sparkles },
  { key: "manual", label: "Вручную", icon: PenLine },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function GenerateTabs({ initialTab = "ai" }: { initialTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Способ создания поделки"
        className="flex gap-1 rounded-full bg-paper-deep p-1"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-clay text-paper shadow-card"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "ai" ? (
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              AI-генерация мастер-класса
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Придумайте тему — модель предложит черновик. Он превратится в поделку
              с картинкой только после вашего одобрения.
            </p>
          </header>
          <GenerateCraft />
        </div>
      ) : (
        <NewPodelkaClient />
      )}
    </div>
  );
}
