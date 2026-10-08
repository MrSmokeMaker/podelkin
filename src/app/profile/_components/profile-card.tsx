"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Heart, LogOut, Pencil } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import {
  BOARD_LIMITS,
  GENERATION_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  PROJECT_LIMITS,
  ROLES,
  WEEKLY_CRAFTS,
  formatLimit,
  type Role,
} from "@/lib/feature-flags";
import { readFavoriteIds } from "@/lib/favorites";
import { cn } from "@/lib/utils";

/* Сравнение тарифов: цифры берём из feature-flags, чтобы таблица
   не разошлась с реальными лимитами. Последние две строки — текстом. */
const TABLE_ROWS: { label: string; values: Record<Role, string> }[] = [
  {
    label: "ИИ-генераций в день",
    values: {
      basic: String(GENERATION_LIMITS.basic),
      premium: String(GENERATION_LIMITS.premium),
      director: String(GENERATION_LIMITS.director),
    },
  },
  {
    label: "Проекты",
    values: {
      basic: formatLimit(PROJECT_LIMITS.basic),
      premium: formatLimit(PROJECT_LIMITS.premium),
      director: formatLimit(PROJECT_LIMITS.director),
    },
  },
  {
    label: "Коллекции",
    values: {
      basic: formatLimit(BOARD_LIMITS.basic),
      premium: formatLimit(BOARD_LIMITS.premium),
      director: formatLimit(BOARD_LIMITS.director),
    },
  },
  {
    label: "Экспорт",
    values: { basic: "TXT", premium: "+ CSV", director: "+ JSON" },
  },
  {
    label: "Подписка на поделки",
    values: {
      basic: "—",
      premium: `${WEEKLY_CRAFTS} в неделю`,
      director: `${WEEKLY_CRAFTS} в неделю`,
    },
  },
  {
    label: "Аналитика",
    values: { basic: "Базовая", premium: "Расширенная", director: "ИИ-метрики" },
  },
];

const NAME_STORAGE_KEY = "rukodelie-profile-name";

export function ProfileCard() {
  const router = useRouter();
  const showToast = useToast();
  const { user, refresh } = useSession();
  const { role } = useFeatureFlags();
  const [name, setName] = useState("Гость мастерской");
  const [favorites, setFavorites] = useState(0);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
    } else {
      const stored = window.localStorage.getItem(NAME_STORAGE_KEY);
      if (stored) setName(stored);
    }
    setFavorites(readFavoriteIds().length);
  }, [user]);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "Г";

  const updateName = (value: string) => {
    setName(value);
    try {
      window.localStorage.setItem(NAME_STORAGE_KEY, value);
    } catch {
      /* приватный режим — имя просто не сохранится */
    }
  };

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refresh();
      showToast("Вы вышли из аккаунта", "Данные мастерской остаются на устройстве");
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 sm:p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-clay text-xl font-bold text-paper shadow-card"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <label htmlFor="profile-name" className="sr-only">
                Ваше имя
              </label>
              <input
                id="profile-name"
                value={name}
                maxLength={40}
                autoFocus
                onChange={(e) => updateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditing(false);
                }}
                className="w-full max-w-xs rounded-xl bg-paper-deep/60 px-3 py-1.5 text-xl font-bold outline-none ring-2 ring-clay/40"
              />
              <button
                type="button"
                onClick={() => setEditing(false)}
                aria-label="Сохранить имя"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-[#55693F] transition active:scale-95"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="truncate text-xl font-bold">{name}</p>
              {!user && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 text-xs font-semibold text-ink-soft transition-colors hover:text-ink active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  Изменить имя
                </button>
              )}
            </div>
          )}
          <p className="mt-1 truncate text-xs text-ink-soft">
            {user ? user.email : "Войдите, чтобы синхронизировать тариф и оплату"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 py-1.5 text-xs font-semibold">
          <Heart className="h-3.5 w-3.5 text-blush" aria-hidden />
          {favorites} в избранном
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl ring-1 ring-ink/10">
        <div
          aria-label="Сравнение тарифов"
          className="grid grid-cols-[1.15fr_repeat(3,1fr)] text-xs"
        >
          <div aria-hidden className="bg-paper-deep/50" />
          {ROLES.map((r) => {
            const current = r === role;
            const cell = (
              <>
                <span className="block text-[11px] font-bold leading-tight">
                  {PLAN_LABELS[r]}
                </span>
                <span
                  className={cn(
                    "block text-[10px] font-medium leading-tight",
                    current ? "text-paper/80" : "text-ink-soft"
                  )}
                >
                  {PLAN_PRICES[r] === 0 ? "0 ₽" : `${PLAN_PRICES[r]} ₽`}
                </span>
                {current && <span className="sr-only"> — ваш текущий тариф</span>}
              </>
            );
            return current ? (
              <div
                key={r}
                className="bg-clay px-1 py-2 text-center text-paper shadow-card"
              >
                {cell}
              </div>
            ) : (
              <Link
                key={r}
                href="/billing"
                className="bg-paper-deep/50 px-1 py-2 text-center text-ink transition-colors hover:bg-clay-soft/60"
              >
                {cell}
              </Link>
            );
          })}
          {TABLE_ROWS.map(({ label, values }) => (
            <div key={label} className="contents">
              <div className="border-t border-ink/5 px-2.5 py-2 text-[11px] font-medium leading-tight text-ink-soft">
                {label}
              </div>
              {ROLES.map((r) => (
                <div
                  key={r}
                  className={cn(
                    "border-t border-ink/5 px-1 py-2 text-center text-[11px] font-semibold leading-tight",
                    r === role && "bg-clay-soft/50 text-[#8A4A2C]"
                  )}
                >
                  {values[r]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ink-soft">
        Текущий тариф подсвечен. Нажмите на другой столбец, чтобы сравнить и
        сменить тариф.
      </p>

      <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row">
        {user ? (
          <>
            <Link
              href="/billing"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Сменить тариф
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {loggingOut ? "Выходим…" : "Выйти"}
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
            >
              Регистрация
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
