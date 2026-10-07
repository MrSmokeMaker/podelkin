import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  Hammer,
  ListChecks,
  Timer,
  Wallet,
  Wrench,
} from "lucide-react";
import { CraftPhoto } from "@/components/craft-photo";
import { SafetyBanner } from "@/components/safety-banner";
import { ShoppingList } from "@/components/shopping-list";
import { ProgressBar } from "@/components/progress";
import {
  crafts,
  craftCost,
  craftMinutes,
  difficultyTone,
  formatMinutes,
  formatRub,
  getCraft,
  stockStatus,
} from "@/lib/crafts";

export function generateStaticParams() {
  return crafts.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const craft = getCraft(slug);
  if (!craft) return { title: "Не найдено" };
  return { title: craft.title, description: craft.description };
}

export default async function CraftPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const craft = getCraft(slug);
  if (!craft) notFound();

  const totalCost = craftCost(craft);

  return (
    <article className="space-y-6">
      <nav className="text-sm text-ink-soft" aria-label="Хлебные крошки">
        <Link href="/catalog" className="hover:text-ink hover:underline">
          Каталог
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{craft.title}</span>
      </nav>

      <header className="overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-ink/5">
        <CraftPhoto craft={craft} rounded="" />
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-clay-soft px-3 py-1 text-xs font-semibold text-[#8A4A2C]">
              {craft.category}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyTone[craft.difficulty]}`}
            >
              {craft.difficulty}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {craft.title}
          </h1>
          <p className="max-w-2xl text-ink-soft">{craft.description}</p>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-clay" />
              <dt className="text-ink-soft">Время:</dt>
              <dd className="font-semibold">
                {formatMinutes(craftMinutes(craft))}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-clay" />
              <dt className="text-ink-soft">Материалы:</dt>
              <dd className="font-semibold">{formatRub(totalCost)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-clay" />
              <dt className="text-ink-soft">Шагов:</dt>
              <dd className="font-semibold">{craft.steps.length}</dd>
            </div>
          </dl>
          <Link
            href={`/build/${craft.slug}`}
            className="mt-2 flex min-h-12 w-fit items-center gap-2 rounded-xl bg-clay px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            <Hammer className="h-4 w-4" />
            Начать работу
          </Link>
        </div>
      </header>

      <SafetyBanner notes={craft.safetyNotes} />

      <section aria-label="Материалы и инструменты" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
          <h2 className="text-lg font-bold">Материалы</h2>
          <ul className="mt-3 space-y-3">
            {craft.materials.map((m) => {
              const status = stockStatus(m.name, m.qty, m.unit);
              return (
                <li key={m.name}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="shrink-0 text-ink-soft">
                      {m.qty} {m.unit} · {formatRub(m.qty * m.price)}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs font-medium ${
                      status.tone === "ok"
                        ? "text-[#55693F]"
                        : status.tone === "low"
                          ? "text-[#8A6A2F]"
                          : "text-[#9C5570]"
                    }`}
                  >
                    {status.label}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Wrench className="h-5 w-5 text-clay" />
            Инструменты
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {craft.tools.map((tool) => (
              <li
                key={tool}
                className="rounded-full bg-paper-deep px-3.5 py-2 text-sm font-medium text-ink"
              >
                {tool}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Этапы работы" className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Timer className="h-5 w-5 text-clay" />
          Этапы работы
        </h2>
        <ol className="mt-4 space-y-4">
          {craft.steps.map((step, i) => (
            <li key={step.title} className="relative pl-12">
              <span className="absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-clay-soft text-sm font-bold text-[#8A4A2C]">
                {i + 1}
              </span>
              {i < craft.steps.length - 1 && (
                <span className="absolute left-4 top-10 h-[calc(100%-1.5rem)] w-px bg-ink/15" />
              )}
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{step.description}</p>
              <p className="mt-1.5 text-xs font-medium text-clay">
                ~{formatMinutes(step.minutes)}
                {step.safety && (
                  <span className="ml-2 rounded-full bg-sand-soft px-2 py-0.5 font-semibold text-[#8A6A2F]">
                    есть предостережение
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
        <ProgressBar
          className="mt-6"
          value={0}
          max={craft.steps.length}
          label="Прогресс появится в режиме мастера"
        />
      </section>

      <ShoppingList craft={craft} />
    </article>
  );
}
