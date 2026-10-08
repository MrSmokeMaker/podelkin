"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Hammer,
  PartyPopper,
  Wrench,
} from "lucide-react";
import { ProgressBar } from "@/components/progress";
import { CraftPhoto } from "@/components/craft-photo";
import { SafetyBanner } from "@/components/safety-banner";
import { Stopwatch } from "@/components/stopwatch";
import {
  craftMinutes,
  formatMinutes,
  getCraft,
  stockStatus,
} from "@/lib/crafts";

export function BuildClient({ slug }: { slug: string }) {
  const craft = getCraft(slug);
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(
    () => craft?.steps.map(() => false) ?? []
  );

  if (!craft) return null;

  const total = craft.steps.length;
  const finished = stepIndex >= total;
  const step = craft.steps[Math.min(stepIndex, total - 1)];
  const completedCount = done.filter(Boolean).length;

  const goNext = () => {
    setDone((d) => d.map((v, i) => (i === stepIndex ? true : v)));
    setStepIndex((i) => Math.min(i + 1, total));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={`/craft/${craft.slug}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-ink shadow-card ring-1 ring-ink/5 transition active:scale-95"
          aria-label="К описанию мастер-класса"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
            Режим мастера
          </p>
          <h1 className="truncate text-lg font-bold">{craft.title}</h1>
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
              Шаг {stepIndex + 1} из {total} · ~{formatMinutes(step.minutes)}
            </p>
            <h2 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">
              {step.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink/90">
              {step.description}
            </p>

            {step.safety && (
              <SafetyBanner notes={[step.safety]} compact />
            )}

            {(step.materials.length > 0 || step.tools.length > 0) && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {step.materials.length > 0 && (
                  <div className="rounded-2xl bg-paper-deep/60 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                      Материалы шага
                    </h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {step.materials.map((name) => {
                        const material = craft.materials.find(
                          (m) => m.name === name
                        );
                        const status = material
                          ? stockStatus(name, material.qty, material.unit)
                          : { label: "", tone: "ok" as const };
                        return (
                          <li key={name}>
                            <span className="font-medium">{name}</span>
                            {status.label && (
                              <span
                                className={`ml-2 text-xs font-medium ${
                                  status.tone === "ok"
                                    ? "text-[#55693F]"
                                    : status.tone === "low"
                                      ? "text-[#8A6A2F]"
                                      : "text-[#9C5570]"
                                }`}
                              >
                                {status.label}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {step.tools.length > 0 && (
                  <div className="rounded-2xl bg-paper-deep/60 p-4">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      <Wrench className="h-3.5 w-3.5" />
                      Инструменты шага
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {step.tools.map((tool) => (
                        <li
                          key={tool}
                          className="rounded-full bg-white px-3 py-1.5 text-sm font-medium"
                        >
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>

          <Stopwatch stepTitle={step.title} />

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
          <div className="mx-auto max-w-sm overflow-hidden rounded-2xl shadow-card ring-1 ring-ink/5">
            <CraftPhoto
              craft={craft}
              className="aspect-square w-full"
              rounded=""
            />
          </div>
          <span className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-[#55693F]">
            <PartyPopper className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Готово!</h2>
          <p className="mt-2 text-ink-soft">
            Все {total} шагов мастер-класса «{craft.title}» пройдены. Общее
            время по плану — {formatMinutes(craftMinutes(craft))}.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/catalog"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              <Hammer className="h-4 w-4" />
              Выбрать следующее
            </Link>
            <button
              type="button"
              onClick={() => {
                setStepIndex(0);
                setDone(craft.steps.map(() => false));
              }}
              className="flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
            >
              Пройти заново
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
