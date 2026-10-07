"use client";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Clock,
  ImageOff,
  ListChecks,
  Loader2,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { difficultyTone, formatMinutes } from "@/lib/crafts";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useToast } from "@/components/toast";

interface DraftData {
  title: string;
  summary: string;
  category: string;
  difficulty: "Легко" | "Средне" | "Сложно";
  estimatedTimeMin: number;
  steps: { n: number; text: string; minutes: number }[];
  materials: { name: string; qty: number; unit: string; optional: boolean }[];
  tools: string[];
  tags: string[];
  safetyNotes: string | null;
  imagePrompt: string;
}

interface DraftInfo {
  id: string;
  data: DraftData;
  cached: boolean;
}

interface ApproveResult {
  craftId: string;
  imageUrl: string | null;
  imageFailed: boolean;
  fromCache: boolean;
}

type Phase = "form" | "generating" | "draft" | "approving" | "done";

const SUGGESTIONS = [
  "подсвечник из банки и джута",
  "органайзер для рукоделия из джинсов",
  "осенний венок из шишек",
  "коврик из старых футболок",
];

const PRIMARY_BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-6 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

const SECONDARY_BTN =
  "inline-flex min-h-12 items-center rounded-xl bg-white px-6 text-sm font-semibold ring-1 ring-ink/10 transition hover:bg-paper-deep disabled:opacity-60";

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

export function GenerateCraft() {
  const { role } = useFeatureFlags();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [draft, setDraft] = useState<DraftInfo | null>(null);
  const [result, setResult] = useState<ApproveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);

  const trimmed = topic.trim();
  const topicValid = trimmed.length >= 3 && trimmed.length <= 120;
  const busy = phase === "generating" || phase === "approving";

  async function generate() {
    if (!topicValid || busy) return;
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch(`/api/crafts/from-ai?role=${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as {
        draftId?: string;
        data?: DraftData;
        cached?: boolean;
        remainingQuota?: number;
        error?: string;
        retryAfterSeconds?: number;
      } | null;

      if (res.status === 201 && body?.draftId && body.data) {
        setDraft({
          id: body.draftId,
          data: body.data,
          cached: Boolean(body.cached),
        });
        setRemainingQuota(Number(body.remainingQuota) || 0);
        setPhase("draft");
        if (body.cached) {
          toast(
            "Черновик из кэша",
            "Такая тема уже генерировалась за последние сутки — квота не списана"
          );
        }
        return;
      }

      if (res.status === 429) {
        const retry = Number(body?.retryAfterSeconds) || 0;
        setError(
          retry > 0
            ? `${body?.error ?? "Лимит исчерпан"} Повторите примерно через ${retry} с.`
            : body?.error ?? "Лимит генераций исчерпан"
        );
      } else {
        setError(body?.error ?? `Ошибка генерации (${res.status})`);
      }
      setPhase("form");
    } catch {
      setError("Сеть недоступна — проверьте соединение и попробуйте ещё раз");
      setPhase("form");
    }
  }

  async function approve() {
    if (!draft || busy) return;
    setPhase("approving");
    setError(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/approve`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => null)) as {
        craftId?: string;
        imageUrl?: string | null;
        fromCache?: boolean;
        imageFailed?: boolean;
        error?: string;
      } | null;

      if (res.status === 201 && body?.craftId) {
        setResult({
          craftId: body.craftId,
          imageUrl: body.imageUrl ?? null,
          imageFailed: Boolean(body.imageFailed),
          fromCache: Boolean(body.fromCache),
        });
        setPhase("done");
        toast(
          "Поделка создана",
          body.imageFailed
            ? "Текст сохранён, но картинка не отрисовалась"
            : undefined
        );
        return;
      }

      setError(body?.error ?? `Не удалось создать поделку (${res.status})`);
      if (res.status === 404 || res.status === 409) {
        setDraft(null);
        setPhase("form");
      } else {
        setPhase("draft");
      }
    } catch {
      setError("Сеть недоступна — попробуйте одобрить черновик ещё раз");
      setPhase("draft");
    }
  }

  function backToForm() {
    setDraft(null);
    setError(null);
    setPhase("form");
  }

  function restart() {
    setDraft(null);
    setResult(null);
    setTopic("");
    setError(null);
    setPhase("form");
  }

  return (
    <div className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-blush-soft px-4 py-3 text-sm font-medium text-[#9C5570] ring-1 ring-[#9C5570]/20"
        >
          {error}
        </div>
      )}

      {(phase === "form" || phase === "generating") && (
        <section
          aria-label="Тема генерации"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6"
        >
          <label htmlFor="topic" className="text-sm font-bold">
            Тема мастер-класса
          </label>
          <p className="mt-1 text-xs text-ink-soft">
            Например: «подсвечник из банки и джута» — от 3 до 120 символов
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && generate()}
              disabled={busy}
              maxLength={120}
              placeholder="О чём мастер-класс?"
              className="min-h-12 w-full rounded-xl bg-paper-deep/60 px-4 text-sm outline-none ring-1 ring-ink/10 transition focus:ring-2 focus:ring-clay disabled:opacity-60"
            />
            <button
              type="button"
              onClick={generate}
              disabled={busy || !topicValid}
              className={cn(PRIMARY_BTN, "sm:w-auto")}
            >
              {phase === "generating" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              Сгенерировать
            </button>
          </div>
          {!topicValid && trimmed.length > 0 && (
            <p className="mt-2 text-xs font-medium text-[#9C5570]">
              Нужно от 3 до 120 символов
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {remainingQuota !== null &&
              (remainingQuota > 0 ? (
                <Chip className="bg-mist-soft text-[#4A6D8C]">
                  Осталось генераций сегодня: {remainingQuota}
                </Chip>
              ) : (
                <Chip className="bg-blush-soft text-[#9C5570]">
                  Лимит на сегодня исчерпан
                </Chip>
              ))}
            <span className="text-xs text-ink-soft">Попробуйте:</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTopic(suggestion)}
                disabled={busy}
                className="rounded-full bg-paper-deep/60 px-3 py-1 text-xs font-medium text-ink-soft transition hover:bg-clay-soft hover:text-[#8A4A2C] disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>
      )}

      {phase === "generating" && (
        <section
          aria-live="polite"
          className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
        >
          <Loader2
            className="h-6 w-6 shrink-0 animate-spin text-clay"
            aria-hidden
          />
          <div>
            <p className="text-sm font-bold">Groq пишет черновик…</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Обычно 5–20 секунд. Если ответ не пройдёт валидацию, будет ровно
              один автоматический повтор.
            </p>
          </div>
        </section>
      )}

      {(phase === "draft" || phase === "approving") && draft && (
        <section
          aria-label="Черновик мастер-класса"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Chip className="bg-paper-deep text-ink-soft">
              {draft.data.category}
            </Chip>
            <Chip className={difficultyTone[draft.data.difficulty]}>
              {draft.data.difficulty}
            </Chip>
            <Chip className="bg-mist-soft text-[#4A6D8C]">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatMinutes(draft.data.estimatedTimeMin)}
            </Chip>
            {draft.cached && (
              <Chip className="bg-sage-soft text-[#55693F]">
                из кэша — без списания квоты
              </Chip>
            )}
          </div>

          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
            {draft.data.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {draft.data.summary}
          </p>

          <h3 className="mt-5 flex items-center gap-2 text-sm font-bold">
            <ListChecks className="h-4 w-4 text-clay" aria-hidden />
            Шаги
          </h3>
          <ol className="mt-3 space-y-2.5">
            {draft.data.steps.map((step) => (
              <li
                key={step.n}
                className="flex gap-3 rounded-xl bg-paper-deep/50 px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay text-xs font-bold text-paper">
                  {step.n}
                </span>
                <p className="flex-1 text-sm leading-relaxed">{step.text}</p>
                <span className="shrink-0 pt-0.5 text-xs font-semibold text-ink-soft">
                  {step.minutes} мин
                </span>
              </li>
            ))}
          </ol>

          <h3 className="mt-5 text-sm font-bold">Материалы</h3>
          <ul className="mt-3 divide-y divide-ink/5 rounded-xl bg-paper-deep/40 px-4">
            {draft.data.materials.map((material) => (
              <li
                key={material.name}
                className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
              >
                <span>
                  {material.name}
                  {material.optional && (
                    <span className="ml-2 text-xs text-ink-soft">
                      опционально
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-ink-soft">
                  {material.qty} {material.unit}
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mt-5 flex items-center gap-2 text-sm font-bold">
            <Wrench className="h-4 w-4 text-clay" aria-hidden />
            Инструменты
          </h3>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {draft.data.tools.map((tool) => (
              <Chip key={tool} className="bg-paper-deep/70 font-medium">
                {tool}
              </Chip>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {draft.data.tags.map((tag) => (
              <Chip key={tag} className="bg-clay-soft text-[#8A4A2C]">
                #{tag}
              </Chip>
            ))}
          </div>

          {draft.data.safetyNotes && (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-sand-soft px-4 py-3">
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6A2F]"
                aria-hidden
              />
              <p className="text-sm leading-relaxed text-[#8A6A2F]">
                {draft.data.safetyNotes}
              </p>
            </div>
          )}

          <details className="mt-4 rounded-xl bg-paper-deep/40 px-4 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-ink-soft">
              Промпт для картинки
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {draft.data.imagePrompt}
            </p>
          </details>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={approve}
              disabled={phase === "approving"}
              className={PRIMARY_BTN}
            >
              {phase === "approving" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
              {phase === "approving" ? "Создаём…" : "Одобрить и создать"}
            </button>
            <button
              type="button"
              onClick={backToForm}
              disabled={phase === "approving"}
              className={SECONDARY_BTN}
            >
              Отменить
            </button>
          </div>
          {phase === "approving" && (
            <p className="mt-3 animate-pulse text-xs text-ink-soft">
              Рисуем картинку по промпту — может занять до минуты.
            </p>
          )}
        </section>
      )}

      {phase === "done" && result && draft && (
        <section
          aria-label="Созданная поделка"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-[#55693F]">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Поделка создана</h2>
              <p className="truncate text-sm text-ink-soft">
                {draft.data.title}
              </p>
            </div>
          </div>

          {result.imageUrl ? (
            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-ink/10">
              <img
                src={result.imageUrl}
                alt={`Сгенерированная картинка: ${draft.data.title}`}
                className="aspect-square w-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 p-8 text-center">
              <ImageOff className="h-8 w-8 text-ink-soft" aria-hidden />
              <p className="text-sm font-medium">Картинка не отрисовалась</p>
              <p className="text-xs text-ink-soft">
                Текст мастер-класса сохранён — поделка осталась без обложки.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-paper-deep px-3 py-1 font-mono text-xs text-ink-soft">
              {result.craftId}
            </span>
            {result.fromCache && (
              <Chip className="bg-sage-soft text-[#55693F]">
                картинка из кэша — seed переиспользован
              </Chip>
            )}
          </div>

          <button type="button" onClick={restart} className={cn(PRIMARY_BTN, "mt-5")}>
            <Sparkles className="h-4 w-4" aria-hidden />
            Сгенерировать ещё
          </button>
        </section>
      )}
    </div>
  );
}
