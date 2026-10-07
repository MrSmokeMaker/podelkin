"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

function fmt(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Stopwatch({ stepTitle }: { stepTitle: string }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now();
    const id = setInterval(() => {
      setElapsed(accumulated.current + (Date.now() - (startedAt.current ?? 0)));
    }, 250);
    return () => {
      accumulated.current += Date.now() - (startedAt.current ?? 0);
      clearInterval(id);
    };
  }, [running]);

  const reset = () => {
    setRunning(false);
    accumulated.current = 0;
    startedAt.current = null;
    setElapsed(0);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
          Секундомер — {stepTitle}
        </p>
        <p
          className={`font-mono text-3xl font-bold tabular-nums ${
            running ? "text-clay" : "text-ink"
          }`}
        >
          {fmt(elapsed)}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay text-paper shadow-card transition active:scale-95"
          aria-label={running ? "Пауза" : "Старт"}
        >
          {running ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-clay-soft text-[#8A4A2C] transition active:scale-95"
          aria-label="Сбросить"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
