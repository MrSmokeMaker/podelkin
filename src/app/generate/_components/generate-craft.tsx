"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ImageOff,
  Link2,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { difficultyTone, formatMinutes } from "@/lib/crafts";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useToast } from "@/components/toast";
import type { CatalogItem } from "@/lib/catalog-db";

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

interface SourceSuggestion {
  url: string;
  title: string;
  site: string;
  siteLabel: string;
}

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

function ElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);
  return <span className="tabular-nums">{seconds} с</span>;
}

/* Детерминированная обложка-заглушка: палитра и фигуры выводятся из хэша
   промпта, поэтому одна и та же поделка всегда получает одну и ту же SVG. */
const COVER_PALETTES = [
  ["#F2D9CC", "#C77B58"], // clay
  ["#E4EBDC", "#9CAF88"], // sage
  ["#F5E9D2", "#DDB771"], // sand
  ["#F4DFE6", "#C98DA4"], // blush
  ["#DDE8F0", "#8FAEC7"], // mist
];

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) >>> 0;
}

function CoverSvg({
  seedValue,
  className,
}: {
  seedValue: string;
  className?: string;
}) {
  const seed = hashSeed(seedValue);
  const [from, to] = COVER_PALETTES[seed % COVER_PALETTES.length];
  const x1 = 15 + (seed % 70);
  const y1 = 15 + (Math.floor(seed / 7) % 60);
  const x2 = 30 + (Math.floor(seed / 49) % 55);
  const y2 = 35 + (Math.floor(seed / 343) % 50);
  const r1 = 18 + (Math.floor(seed / 2401) % 22);
  const r2 = 12 + (Math.floor(seed / 16807) % 18);
  const gid = `cover-grad-${seed.toString(36)}`;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} opacity="0.55" />
      <circle cx={x1} cy={y1} r={r1} fill={to} opacity="0.35" />
      <circle cx={x2} cy={y2} r={r2} fill={from} opacity="0.8" />
      <circle cx={100 - x1} cy={100 - y1} r={r2} fill="#F7F2EA" opacity="0.5" />
    </svg>
  );
}

function CraftCover({
  url,
  alt,
  seedValue,
}: {
  url: string;
  alt: string;
  seedValue: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative mt-4 overflow-hidden rounded-2xl ring-1 ring-ink/10">
      <CoverSvg seedValue={seedValue} className="aspect-square w-full" />
      {!failed && (
        <img
          src={url}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  );
}

export function GenerateCraft() {
  const { role } = useFeatureFlags();
  const toast = useToast();
  const [topic, setTopic] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [draft, setDraft] = useState<DraftInfo | null>(null);
  const [result, setResult] = useState<ApproveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<CatalogItem | null>(null);
  const [suggestions, setSuggestions] = useState<SourceSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [failedSites, setFailedSites] = useState<string[]>([]);
  const [activeSuggest, setActiveSuggest] = useState(-1);
  const searchSeq = useRef(0);

  const trimmed = topic.trim();
  const topicValid = trimmed.length >= 3 && trimmed.length <= 120;
  const urlTrimmed = sourceUrl.trim();
  const urlValid = /^https?:\/\/\S{4,}/i.test(urlTrimmed);
  const busy = phase === "generating" || phase === "approving" || importing;
  const queryLike = urlTrimmed.length >= 3 && !/^https?:\/\//i.test(urlTrimmed);
  const looksLikeUrlAttempt =
    urlTrimmed.length > 0 &&
    (/^(https?:\/\/|[\w.-]+\.(ru|com|net|org|info|рф))/i.test(urlTrimmed));

  /* Живой поиск по сайтам-источникам: поле принимает и ссылку, и слова.
     После паузы печатания уходит запрос, варианты падают в меню под полем. */
  useEffect(() => {
    const value = sourceUrl.trim();
    if (value.length < 3 || /^https?:\/\//i.test(value)) {
      searchSeq.current += 1;
      setSuggestOpen(false);
      setSuggestLoading(false);
      setSuggestions([]);
      setFailedSites([]);
      return;
    }
    const seq = ++searchSeq.current;
    setSuggestOpen(true);
    setSuggestLoading(true);
    setFailedSites([]);
    setActiveSuggest(-1);
    const timer = setTimeout(() => {
      fetch(`/api/source-search?q=${encodeURIComponent(value)}`)
        .then((res) => res.json())
        .then((data: { results?: SourceSuggestion[]; failed?: string[] }) => {
          if (seq !== searchSeq.current) return;
          setSuggestions(data.results ?? []);
          setFailedSites(data.failed ?? []);
          setSuggestLoading(false);
        })
        .catch(() => {
          if (seq !== searchSeq.current) return;
          setSuggestions([]);
          setFailedSites(["1001zagotovka.ru", "only-paper.ru"]);
          setSuggestLoading(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceUrl]);

  function pickSuggestion(item: SourceSuggestion) {
    setSourceUrl(item.url);
    searchSeq.current += 1;
    setSuggestOpen(false);
    setSuggestLoading(false);
    setActiveSuggest(-1);
  }

  /* Импорт из источника: страница разбирается на сервере, поделка сразу
     попадает в каталог «Поделки» — без AI-генерации и без квоты. */
  async function importFromSource() {
    if (busy || !urlValid) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlTrimmed }),
      });
      const body = (await res.json().catch(() => null)) as {
        item?: CatalogItem;
        error?: string;
      } | null;

      if (res.ok && body?.item) {
        setImported(body.item);
        setSourceUrl("");
        toast(
          "Поделка добавлена в «Поделки»",
          body.item.thumbnail ? undefined : "Итоговое фото скачать не удалось"
        );
        return;
      }
      setError(body?.error ?? `Не удалось добавить поделку (${res.status})`);
    } catch {
      setError("Сеть недоступна — проверьте соединение и попробуйте ещё раз");
    } finally {
      setImporting(false);
    }
  }

  async function generate() {
    if (busy || !topicValid) return;
    setPhase("generating");
    setError(null);
    try {
      const res = await fetch(`/api/crafts/from-ai?role=${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
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
    setSourceUrl("");
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

      {(phase === "form" || phase === "generating") && !imported && (
        <section
          aria-label="Генерация поделки"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6"
        >
          <label htmlFor="topic" className="text-sm font-bold">
            Новая поделка с нуля
          </label>
          <p className="mt-1 text-xs text-ink-soft">
            Опишите словами, что придумать: «подсвечник из банки и джута» — от 3 до 120 символов
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
              Сгенерировать с нуля
            </button>
          </div>
          {!topicValid && trimmed.length > 0 && (
            <p className="mt-2 text-xs font-medium text-[#9C5570]">
              Нужно от 3 до 120 символов
            </p>
          )}

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            <span className="h-px flex-1 bg-ink/10" aria-hidden />
            или по готовому образцу
            <span className="h-px flex-1 bg-ink/10" aria-hidden />
          </div>

          <label htmlFor="source-url" className="text-sm font-bold">
            Добавить в «Поделки» из источника
          </label>
          <p className="mt-1 text-xs text-ink-soft">
            Вставьте ссылку на мастер-класс — или вводите слова для поиска.
            Поделка сохранится в «Поделки» с итоговым фото, шагами и материалами
            со страницы-оригинала — без AI-генерации и без списания квоты
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div
              className="relative min-w-0 flex-1"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSuggestOpen(false);
                }
              }}
            >
              <Search
                className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft"
                aria-hidden
              />
              <input
                id="source-url"
                type="text"
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestOpen}
                aria-controls="source-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  activeSuggest >= 0 ? `source-suggest-${activeSuggest}` : undefined
                }
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                onFocus={() => {
                  if (queryLike) setSuggestOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && suggestOpen && suggestions.length > 0) {
                    event.preventDefault();
                    setActiveSuggest((i) => Math.min(i + 1, suggestions.length - 1));
                  } else if (event.key === "ArrowUp" && suggestOpen && suggestions.length > 0) {
                    event.preventDefault();
                    setActiveSuggest((i) => Math.max(i - 1, -1));
                  } else if (event.key === "Escape" && suggestOpen) {
                    setSuggestOpen(false);
                  } else if (event.key === "Enter") {
                    if (suggestOpen && activeSuggest >= 0 && suggestions[activeSuggest]) {
                      event.preventDefault();
                      pickSuggestion(suggestions[activeSuggest]);
                    } else {
                      importFromSource();
                    }
                  }
                }}
                disabled={busy}
                maxLength={2000}
                placeholder="Ссылка на МК или слова для поиска"
                className="min-h-12 w-full rounded-xl bg-paper-deep/60 pl-10 pr-4 text-sm outline-none ring-1 ring-ink/10 transition focus:ring-2 focus:ring-clay disabled:opacity-60"
              />
              {suggestOpen && (
                <div
                  id="source-suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl bg-white shadow-soft ring-1 ring-ink/10"
                >
                  {suggestLoading && (
                    <p className="flex items-center gap-2 px-4 py-3 text-xs text-ink-soft">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Ищем на 1001zagotovka.ru и only-paper.ru…
                    </p>
                  )}
                  {!suggestLoading && suggestions.length === 0 && (
                    <p className="px-4 py-3 text-xs text-ink-soft">
                      {failedSites.length > 0
                        ? "Поиск сейчас недоступен — вставьте ссылку на мастер-класс вручную"
                        : "Ничего не нашлось — попробуйте другие слова или вставьте ссылку"}
                    </p>
                  )}
                  {suggestions.length > 0 && (
                    <ul
                      role="listbox"
                      aria-label="Варианты с сайтов-источников"
                      className="max-h-72 scrollbar-none overflow-y-auto"
                    >
                      {suggestions.map((item, index) => (
                        <li key={item.url}>
                          <button
                            type="button"
                            id={`source-suggest-${index}`}
                            role="option"
                            aria-selected={index === activeSuggest}
                            tabIndex={-1}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveSuggest(index)}
                            onClick={() => pickSuggestion(item)}
                            className={cn(
                              "flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors",
                              index === activeSuggest ? "bg-clay-soft/70" : "bg-white"
                            )}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#8A4A2C]">
                              {item.siteLabel}
                            </span>
                            <span className="line-clamp-2 text-sm font-medium leading-snug">
                              {item.title}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {suggestions.length > 0 && failedSites.length > 0 && (
                    <p className="border-t border-ink/10 px-4 py-2 text-[11px] text-ink-soft">
                      Не удалось спросить: {failedSites.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={importFromSource}
              disabled={busy || !urlValid}
              className={cn(SECONDARY_BTN, "sm:w-auto")}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden />
              )}
              {importing ? "Сохраняем…" : "Из источника"}
            </button>
          </div>
          {looksLikeUrlAttempt && !urlValid && (
            <p className="mt-2 text-xs font-medium text-[#9C5570]">
              Вставьте полную ссылку, начинающуюся с http:// или https://
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

      {imported && (
        <section
          aria-label="Поделка добавлена в каталог"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-[#55693F]">
              <CheckCircle2 className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Добавлено в «Поделки»</h2>
              <p className="truncate text-sm text-ink-soft">{imported.title}</p>
            </div>
          </div>

          {imported.thumbnail ? (
            <CraftCover
              url={imported.thumbnail}
              alt={`Итоговое фото поделки: ${imported.title}`}
              seedValue={imported.id}
            />
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 p-8 text-center">
              <ImageOff className="h-8 w-8 text-ink-soft" aria-hidden />
              <p className="text-sm font-medium">Итоговое фото скачать не удалось</p>
              <p className="text-xs text-ink-soft">
                Шаги и материалы сохранены — фото можно добавить позже вручную.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip className="bg-paper-deep text-ink-soft">{imported.category}</Chip>
            {imported.instructions && imported.instructions.length > 0 && (
              <Chip className="bg-paper-deep text-ink-soft">
                Шагов: {imported.instructions.length}
              </Chip>
            )}
            {imported.materials.length > 0 && (
              <Chip className="bg-paper-deep text-ink-soft">
                Материалов: {imported.materials.length}
              </Chip>
            )}
            {imported.assemblyTime && (
              <Chip className="bg-mist-soft text-[#4A6D8C]">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {imported.assemblyTime}
              </Chip>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/podelki/${imported.id}`} className={PRIMARY_BTN}>
              <ArrowRight className="h-4 w-4" aria-hidden />
              Открыть в поделках
            </Link>
            <button
              type="button"
              onClick={() => {
                setImported(null);
                setError(null);
              }}
              className={SECONDARY_BTN}
            >
              Добавить ещё
            </button>
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
            <p className="text-sm font-bold">
              Думаю… <ElapsedSeconds />
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Обычно 10–40 секунд (по ссылке — дольше). Если ответ не пройдёт
              валидацию, будет ровно один автоматический повтор.
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
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.data.materials.map((material) => (
              <Chip
                key={material.name}
                className={
                  material.optional
                    ? "bg-white text-ink-soft ring-1 ring-ink/15"
                    : "bg-paper-deep/70"
                }
              >
                {material.name}
                <span className="font-normal text-ink-soft">
                  · {material.qty} {material.unit}
                </span>
                {material.optional && (
                  <span className="font-normal text-ink-soft">· опционально</span>
                )}
              </Chip>
            ))}
          </div>

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
            <p className="mt-3 text-xs text-ink-soft">
              Рисуем картинку по промпту… <ElapsedSeconds /> (может занять до
              минуты).
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
            <CraftCover
              url={result.imageUrl}
              alt={`Сгенерированная картинка: ${draft.data.title}`}
              seedValue={draft.data.imagePrompt}
            />
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
