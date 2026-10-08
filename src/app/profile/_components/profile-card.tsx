"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Heart, LogOut, Pencil, X } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { PLAN_LABELS, PLAN_PRICES, formatLimit } from "@/lib/feature-flags";
import { readFavoriteIds } from "@/lib/favorites";

/* Три пункта из брифа — ровно то, что обещаем в модалке. */
const PREMIUM_PERKS = [
  "Генерация с ИИ — 15 в день вместо 3",
  "10 проектов и 20 коллекций одновременно",
  "Расширенная аналитика и экспорт .csv",
];

const NAME_STORAGE_KEY = "rukodelie-profile-name";

export function ProfileCard() {
  const router = useRouter();
  const showToast = useToast();
  const { user, refresh } = useSession();
  const { role, boardLimit } = useFeatureFlags();
  const [name, setName] = useState("Гость мастерской");
  const [favorites, setFavorites] = useState(0);
  const [editing, setEditing] = useState(false);
  const [showPerks, setShowPerks] = useState(false);
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
                <Check className="h-4 w-4" aria-hidden />
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

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex min-h-8 items-center rounded-full bg-clay-soft px-3 py-1.5 text-[#8A4A2C]">
          Твой тариф: {PLAN_LABELS[role]}
        </span>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 py-1.5">
          <Heart className="h-3.5 w-3.5 text-blush" aria-hidden />
          {favorites} в избранном
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full bg-paper-deep/70 px-3 py-1.5">
          Коллекций: до {formatLimit(boardLimit)}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row">
        {user ? (
          <>
            <Link
              href="/billing"
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              Управлять тарифом
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

      {!user && (
        <div className="mt-4 flex flex-col gap-3 border-t border-ink/10 pt-4 sm:flex-row">
          <button
            type="button"
            onClick={() => setShowPerks(true)}
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl border-2 border-clay bg-white px-5 py-3 text-sm font-semibold text-[#8A4A2C] transition hover:bg-clay-soft/40 active:scale-[0.98]"
          >
            Что я получу в Премиуме?
          </button>
          <Link
            href="/billing"
            className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
          >
            Смотреть тарифы — от {PLAN_PRICES.premium} ₽/мес
          </Link>
        </div>
      )}

      {showPerks && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Что даёт Премиум"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          onClick={() => setShowPerks(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold">Что даёт Премиум</h3>
              <button
                type="button"
                onClick={() => setShowPerks(false)}
                aria-label="Закрыть"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink active:scale-95"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {PREMIUM_PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2.5 text-sm font-medium"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-soft text-[#55693F]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
            <Link
              href="/billing"
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-clay px-5 py-2.5 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
            >
              Смотреть тарифы
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
