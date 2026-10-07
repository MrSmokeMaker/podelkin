import type { Metadata } from "next";
import { GenerateCraft } from "./_components/generate-craft";

export const metadata: Metadata = {
  title: "AI-генерация",
  description:
    "Опишите тему — Groq подготовит черновик мастер-класса: шаги, материалы и безопасность. Поделка создаётся только после вашего одобрения.",
};

export default function GeneratePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AI-генерация мастер-класса
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">
          Придумайте тему — модель предложит черновик. Он превратится в поделку
          с картинкой только после вашего одобрения.
        </p>
      </header>
      <GenerateCraft />
    </div>
  );
}
