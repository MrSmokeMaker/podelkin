"use client";

import { useEffect, useState } from "react";
import { Heart, Lock } from "lucide-react";
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
  customBoards: "Свои доски",
  seedControl: "Управление демо-данными",
};

const NAME_STORAGE_KEY = "rukodelie-profile-name";

export function ProfileCard() {
  const { role, isPremium, boardLimit, allowed } = useFeatureFlags();
  const [name, setName] = useState("Гость мастерской");
  const [favorites, setFavorites] = useState(0);

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
          <label htmlFor="profile-name" className="sr-only">
            Ваше имя
          </label>
          <input
            id="profile-name"
            value={name}
            maxLength={40}
            onChange={(e) => updateName(e.target.value)}
            className="-ml-2 w-full max-w-xs rounded-xl px-2 py-1 text-xl font-bold outline-none transition-colors focus:bg-paper-deep/60"
          />
          <p className="-ml-2 px-2 text-xs text-ink-soft">
            Нажмите на имя, чтобы изменить — сохранится на устройстве
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-paper-deep/70 px-3 py-1.5">
          <Heart className="h-3.5 w-3.5 text-blush" aria-hidden />
          {favorites} в избранном
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full bg-paper-deep/70 px-3 py-1.5">
          Досок: до {boardLimit}
        </span>
      </div>

      <div className="mt-5 border-t border-ink/10 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Тариф: {ROLE_LABEL[role]}</h2>
          <div
            role="group"
            aria-label="Демо-переключение тарифа"
            className="flex gap-1.5"
          >
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={r === role}
                onClick={() => switchRole(r)}
                className={cn(
                  "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors active:scale-95",
                  r === role
                    ? "bg-clay text-paper"
                    : "bg-paper-deep/70 text-ink-soft hover:text-ink"
                )}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {allowed.map((feature) => (
            <li
              key={feature}
              className="rounded-full bg-sage-soft px-2.5 py-1 text-[11px] font-medium text-[#55693F]"
            >
              {FEATURE_LABEL[feature]}
            </li>
          ))}
        </ul>
        {!isPremium && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-soft">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Premium открывает расширенную аналитику, экспорт в CSV и офлайн-синхронизацию
          </p>
        )}
      </div>
    </section>
  );
}
