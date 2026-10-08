"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const DISMISS_KEY = "podelki:install-dismissed";

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);
  const prompting = useRef(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* приватный режим — баннер просто покажется снова */
    }
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const installed = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (hidden || !promptEvent) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* не критично: баннер скроется до перезагрузки */
    }
  };

  /* Повторный prompt() на протухшем событии браузер отклоняет с
     InvalidStateError — гасим и защищаем от двойного клика. */
  const install = async () => {
    if (!promptEvent || prompting.current) return;
    prompting.current = true;
    try {
      await promptEvent.prompt();
    } catch {
      /* браузер отказался показать диалог — баннер просто скроется */
    } finally {
      prompting.current = false;
      dismiss();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
      <ArrowDownToLine aria-hidden className="h-5 w-5 shrink-0 text-clay" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Установить «Podelkin»</p>
        <p className="text-xs text-ink-soft">
          Каталог поделок будет доступен офлайн
        </p>
      </div>
      <button
        type="button"
        onClick={install}
        className="rounded-full bg-clay px-4 py-1.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-clay/90"
      >
        Установить
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Скрыть предложение установки"
        className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-paper-deep"
      >
        <X aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
