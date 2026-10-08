"use client";

import { useEffect, useState } from "react";
import { Check, Download, Heart, Pencil } from "lucide-react";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { readFavoriteIds } from "@/lib/favorites";
import {
  ROLES,
  ROLE_STORAGE_KEY,
  type Feature,
  type Role,
} from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<Role, string> = {
  free: "Базовый",
  premium: "Premium",
  admin: "Администратор",
};

const ROLE_PLAN_LABEL: Record<Role, string> = {
  free: "Базовый",
  premium: "Premium",
  admin: "Админ",
};

const FEATURE_LABEL: Record<Feature, string> = {
  search: "Поиск",
  viewCrafts: "Каталог",
  makerMode: "Режим мастера",
  basicStats: "Базовая статистика",
  saveProject: "Сохранение проектов",
  exportTxt: "Экспорт в TXT",
  advancedStats: "Расширенная аналитика",
  exportCsv: "Экспорт в CSV",
  offlineSync: "Офлайн-режим",
  prioritySupport: "Приоритетная поддержка",
  unlimitedProjects: "Без лимита проектов",
  customBoards: "Свои коллекции",
  seedControl: "Управление демо-данными",
};

/* Три ключевых отличия тарифов — то же, что гейтинг в feature-flags. */
const PLAN_ROWS: {
  label: string;
  values: Record<Role, string>;
}[] = [
  {
    label: "Экспорт",
    values: { free: "TXT", premium: "TXT + CSV", admin: "TXT + CSV" },
  },
  {
    label: "Синхронизация",
    values: { free: "—", premium: "Офлайн", admin: "Офлайн" },
  },
  {
    label: "Аналитика",
    values: { free: "Базовая", premium: "Расширенная", admin: "Расширенная" },
  },
];

const NAME_STORAGE_KEY = "rukodelie-profile-name";

export function ProfileCard() {
  const { role, isPremium, boardLimit, allowed } = useFeatureFlags();
  const [name, setName] = useState("Гость мастерской");
  const [favorites, setFavorites] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(NAME_STORAGE_KEY);
    if (stored) setName(stored);
    setFavorites(readFavoriteIds().length);
  }, []);

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

  const switchRole = (next: Role) => {
    if (next === role) return;
    try {
      window.localStorage.setItem(ROLE_STORAGE_KEY, next);
    } catch {
      return;
    }
    window.location.reload();
  };

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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 text-xs font-semibold text-ink-soft transition-colors hover:text-ink active:scale-95"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Редактировать профиль
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-ink-soft">
            Имя сохраняется на устройстве
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex min-h-8 items-center rounded-full bg-clay-soft px-3 py-1.5 text-[#8A4A2C]">
          Тариф: {ROLE_LABEL[role]}
        </span>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 py-1.5">
          <Heart className="h-3.5 w-3.5 text-blush" aria-hidden />
          {favorites} в избранном
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full bg-paper-deep/70 px-3 py-1.5">
          Коллекций: до {boardLimit}
        </span>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-4">
        <div className="overflow-hidden rounded-xl ring-1 ring-ink/10">
          <div
            aria-label="Сравнение тарифов"
            className="grid grid-cols-[1.3fr_repeat(3,1fr)] text-xs"
          >
            <div aria-hidden className="bg-paper-deep/50 p-2.5" />
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === role}
                onClick={() => switchRole(r)}
                className={cn(
                  "min-h-10 p-2.5 text-center text-[11px] font-bold transition-colors",
                  r === role
                    ? "bg-clay text-paper"
                    : "bg-paper-deep/50 text-ink-soft hover:text-ink"
                )}
              >
                {ROLE_PLAN_LABEL[r]}
                {r === role && (
                  <span className="sr-only"> — текущий тариф</span>
                )}
              </button>
            ))}
            {PLAN_ROWS.map(({ label, values }) => (
              <div key={label} className="contents">
                <div className="border-t border-ink/5 p-2.5 font-semibold text-ink-soft">
                  {label}
                </div>
                {ROLES.map((r) => (
                  <div
                    key={r}
                    className={cn(
                      "border-t border-ink/5 p-2.5 text-center font-medium",
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

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {allowed
            .filter((feature) => feature !== "exportTxt")
            .map((feature) => (
              <li
                key={feature}
                className="rounded-full bg-sage-soft px-2.5 py-1 text-[11px] font-medium text-[#55693F]"
              >
                {FEATURE_LABEL[feature]}
              </li>
            ))}
        </ul>

        <a
          href="/export"
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
        >
          <Download className="h-4 w-4" aria-hidden />
          Экспорт в TXT
        </a>

        {!isPremium && (
          <p className="mt-3 text-xs text-ink-soft">
            Premium добавляет CSV, офлайн-синхронизацию и расширенную аналитику —
            см. таблицу выше.
          </p>
        )}
      </div>
    </section>
  );
}
