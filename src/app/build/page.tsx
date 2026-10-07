import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CraftPhoto } from "@/components/craft-photo";
import { crafts, difficultyTone } from "@/lib/crafts";

export const metadata: Metadata = {
  title: "Режим мастера",
  description:
    "Выберите мастер-класс и проходите его по шагам: один шаг на экран, таймер и подсказки.",
};

export default function BuildIndexPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Режим мастера
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Выберите поделку — откроется пошаговый режим с таймером.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2">
        {crafts.map((craft) => (
          <li key={craft.slug}>
            <Link
              href={`/build/${craft.slug}`}
              className="group flex items-center gap-4 rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="w-24 shrink-0 overflow-hidden rounded-xl">
                <CraftPhoto
                  craft={craft}
                  className="aspect-square w-full"
                  rounded=""
                />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-bold group-hover:text-[#8A4A2C]">
                  {craft.title}
                </h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {craft.steps.length} шагов · {craft.category}
                </p>
                <span
                  className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${difficultyTone[craft.difficulty]}`}
                >
                  {craft.difficulty}
                </span>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-ink-soft transition group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
