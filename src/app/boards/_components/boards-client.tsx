"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Lock, Plus } from "lucide-react";
import { PremiumBadge } from "@/components/premium-badge";
import { useToast } from "@/components/toast";
import { useFeatureFlags } from "@/hooks/use-feature-flags";

interface BoardDto {
  id: string;
  title: string;
  craftSlugs: string[];
  craftTitles: string[];
}

export function BoardsClient() {
  const { has, role, boardLimit } = useFeatureFlags();
  const [boards, setBoards] = useState<BoardDto[] | null>(null);
  const [title, setTitle] = useState("");
  const showToast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards?role=${role}`);
      const data = await res.json();
      setBoards(data.boards ?? []);
    } catch {
      setBoards([]);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const atLimit = (boards?.length ?? 0) >= boardLimit;
  const customBoardsAllowed = has("customBoards");

  async function createBoard() {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/boards?role=${role}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("Лимит папок", data.error ?? "Не удалось создать папку");
        return;
      }
      setTitle("");
      showToast("Папка создана", `«${data.board.title}»`);
      load();
    } catch {
      showToast("Ошибка сети", "Проверьте соединение и попробуйте снова");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Папки с идеями
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Подборки поделок под цель: кухня, подарки, детская. Лимит тарифа —{" "}
          {boardLimit} коллекций
        </p>
      </header>

      {!customBoardsAllowed && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand-soft p-4 text-sm font-medium text-[#8A6A2F]">
          <Lock className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            На бесплатном тарифе — до {boardLimit} коллекций. Оформите Premium,
            чтобы вести до 20.
          </p>
          <PremiumBadge tooltip="Premium: до 20 коллекций и неограниченные проекты" />
        </div>
      )}

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          createBoard();
        }}
      >
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Новая папка: например «Подарки на Новый год»"
          maxLength={60}
          disabled={atLimit}
          aria-label="Название новой папки"
          className="min-h-12 flex-1 rounded-xl border border-ink/10 bg-white px-4 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={atLimit || !title.trim()}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Создать папку
        </button>
      </form>

      {boards === null ? (
        <p className="animate-pulse text-sm text-ink-soft">Загружаем папки…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {boards.map((board, index) => {
            const locked = index >= boardLimit;
            return (
              <li key={board.id}>
                {locked ? (
                  <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-paper-deep/40 p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/5">
                        <Lock className="h-5 w-5 text-ink-soft" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink-soft">
                          {board.title}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {board.craftTitles.length} поделок
                        </p>
                      </div>
                      <PremiumBadge tooltip="Эта коллекция откроется на тарифе Premium (до 20 коллекций)" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#9C5570]">
                      Оформите Premium, чтобы открыть коллекцию
                    </p>
                  </div>
                ) : (
                  <div className="h-full rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-[#8A4A2C]">
                        <Layers className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{board.title}</p>
                        <p className="text-xs text-ink-soft">
                          {board.craftTitles.length} поделок
                        </p>
                      </div>
                    </div>
                    {board.craftTitles.length > 0 && (
                      <p className="mt-3 line-clamp-3 text-sm text-ink-soft">
                        {board.craftTitles.join(" · ")}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
