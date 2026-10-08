"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
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
import { useToast } from "@/components/toast";
import {
  craftMinutes,
  crafts,
  formatMinutes,
  formatQty,
  getCraft,
  inventory,
  stockStatus,
} from "@/lib/crafts";

/* Расход материала на один проект — порог «пора докупить» после списания. */
const usageByName: Map<string, number> = (() => {
  const usage = new Map<string, number>();
  for (const craft of crafts) {
    for (const material of craft.materials) {
      usage.set(
        material.name,
        Math.max(usage.get(material.name) ?? 0, material.qty)
      );
    }
  }
  return usage;
})();

interface DeductedItem {
  name: string;
  qty: number;
  unit: string;
}

interface WriteOffResult {
  deducted: DeductedItem[];
  low: DeductedItem[];
}

export function BuildClient({ slug }: { slug: string }) {
  const craft = getCraft(slug);
  const showToast = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState<boolean[]>(
    () => craft?.steps.map(() => false) ?? []
  );
  const [stocks, setStocks] = useState<Record<string, number> | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [writingOff, setWritingOff] = useState(false);
  const [result, setResult] = useState<WriteOffResult | null>(null);

  if (!craft) return null;

  const total = craft.steps.length;
  const finished = stepIndex >= total;
  const step = craft.steps[Math.min(stepIndex, total - 1)];
  const completedCount = done.filter(Boolean).length;

  const stockNow = (name: string): number =>
    stocks?.[name] ?? inventory.find((i) => i.name === name)?.stock ?? 0;

  const goNext = () => {
    setDone((d) => d.map((v, i) => (i === stepIndex ? true : v)));
    setStepIndex((i) => Math.min(i + 1, total));
  };

  const restart = () => {
    setStepIndex(0);
    setDone(craft.steps.map(() => false));
    setResult(null);
    setModalOpen(false);
  };

  const openModal = async () => {
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = (await res.json()) as {
          items: { name: string; stock: number }[];
        };
        const map: Record<string, number> = {};
        for (const item of data.items) map[item.name] = item.stock;
        setStocks(map);
      }
    } catch {
      /* нет связи — списываем по снимку из мока */
    }
    setModalOpen(true);
  };

  const confirmWriteOff = async () => {
    if (writingOff) return;
    setWritingOff(true);
    const deducted: DeductedItem[] = [];
    const low: DeductedItem[] = [];
    try {
      for (const material of craft.materials) {
        const have = stockNow(material.name);
        if (have > 0) {
          const next =
            Math.round(Math.max(0, have - material.qty) * 1000) / 1000;
          const res = await fetch("/api/inventory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: material.name,
              stock: next,
              unit: material.unit,
            }),
          });
          if (!res.ok) throw new Error(`inventory POST ${res.status}`);
          setStocks((prev) => ({ ...(prev ?? {}), [material.name]: next }));
          deducted.push({
            name: material.name,
            qty: Math.round((have - next) * 1000) / 1000,
            unit: material.unit,
          });
        }
        const left = Math.max(0, have - material.qty);
        if (left < (usageByName.get(material.name) ?? 0)) {
          low.push({ name: material.name, qty: left, unit: material.unit });
        }
      }
      setResult({ deducted, low });
      setModalOpen(false);
    } catch {
      showToast("Не получилось списать", "Проверьте связь и попробуйте ещё раз");
    } finally {
      setWritingOff(false);
    }
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
      ) : result ? (
        <section className="rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink/5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage-soft text-[#55693F]">
            <Check className="h-8 w-8" aria-hidden />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Поделка готова! 🎉</h2>
          <p className="mt-2 text-ink-soft">
            «{craft.title}» — план по времени:{" "}
            {formatMinutes(craftMinutes(craft))}.
          </p>

          {result.deducted.length > 0 && (
            <div className="mt-5 rounded-2xl bg-paper-deep/60 p-4 text-left">
              <h3 className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                Списано из запасов
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {result.deducted.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="shrink-0 text-ink-soft">
                      −{formatQty(item.qty)} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.low.length > 0 && (
            <div className="mt-4 rounded-2xl bg-sand-soft p-4 text-left text-[#8A6A2F]">
              <p className="text-sm font-bold">Пора докупить</p>
              <p className="mt-1 text-sm">
                {result.low.map((item) => item.name).join(" · ")}
              </p>
              <p className="mt-1 text-xs">
                Осталось меньше, чем на один такой проект.
              </p>
            </div>
          )}

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
              onClick={restart}
              className="flex min-h-12 items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
            >
              Пройти заново
            </button>
          </div>
        </section>
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
            <PartyPopper className="h-8 w-8" aria-hidden />
          </span>
          <h2 className="mt-4 text-2xl font-bold">Все шаги пройдены!</h2>
          <p className="mt-2 text-ink-soft">
            Общее время по плану — {formatMinutes(craftMinutes(craft))}.
            Осталось списать материалы, которые ушли на поделку.
          </p>
          <button
            type="button"
            onClick={openModal}
            className="mt-6 w-full rounded-xl bg-clay py-4 text-sm font-semibold text-paper shadow-soft transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            Готово! Списать материалы
          </button>
          <button
            type="button"
            onClick={restart}
            className="mt-3 w-full rounded-xl bg-white py-4 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
          >
            Пройти заново
          </button>
        </section>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => {
            if (!writingOff) setModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Списание материалов"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-bold">Списать материалы?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Расход на поделку «{craft.title}» уйдёт из запасов мастерской.
            </p>
            <ul className="mt-4 space-y-2">
              {craft.materials.map((material) => {
                const have = stockNow(material.name);
                const enough = have >= material.qty;
                return (
                  <li
                    key={material.name}
                    className="rounded-2xl bg-paper-deep/60 px-3.5 py-2.5"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {material.name}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-ink-soft">
                        {formatQty(material.qty)} {material.unit}
                      </span>
                    </div>
                    <p
                      className={`mt-0.5 text-xs ${
                        enough
                          ? "font-medium text-[#55693F]"
                          : "font-bold text-red-700"
                      }`}
                    >
                      {enough
                        ? `В запасах: ${formatQty(have)} ${material.unit}`
                        : `Не хватает: ${formatQty(material.qty - have)} ${material.unit}. Нужно докупить.`}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={writingOff}
                className="min-h-12 rounded-xl bg-white text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition enabled:hover:bg-paper-deep enabled:active:scale-[0.98] disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmWriteOff}
                disabled={writingOff}
                className="min-h-12 rounded-xl bg-clay py-4 text-sm font-semibold text-paper shadow-soft transition enabled:hover:bg-[#B06A48] enabled:active:scale-[0.98] disabled:opacity-50"
              >
                {writingOff ? "Списываем…" : "Да, списать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
