import Link from "next/link";
import { ArrowRight, Boxes, ChartPie, Hammer, Sparkles } from "lucide-react";
import { CraftCard } from "@/components/craft-card";
import { crafts, formatRub, craftCost } from "@/lib/crafts";

export default function HomePage() {
  const featured = crafts.slice(0, 6);
  const easy = crafts.filter((c) => c.difficulty === "Легко").length;

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-clay-soft">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#8A4A2C]">
          Мастерская идей
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl">
          Сделай что-нибудь своими руками — по шагам и без суеты
        </h1>
        <p className="mt-3 max-w-lg text-ink-soft">
          {crafts.length} мастер-классов: от простой свечи за вечер до кружки с
          обжигом. Пошаговый режим мастера, списки покупок и учёт запасов.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/generate"
            className="flex min-h-12 items-center gap-2 rounded-xl bg-clay px-6 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            Сгенерировать с AI
          </Link>
          <Link
            href="/stats"
            className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink shadow-card ring-1 ring-ink/10 transition hover:bg-paper-deep active:scale-[0.98]"
          >
            <ChartPie className="h-4 w-4" />
            Статистика мастерской
          </Link>
        </div>
        </div>
        <div className="relative min-h-56 sm:min-h-72 lg:min-h-0">
          <img
            src="/hero-lineart.webp"
            alt="Иллюстрация в стиле лайн-арт: ножницы, клубок пряжи и игла на бежевом фоне"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Популярные мастер-классы
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              От простого к сложному — выбирайте по настроению
            </p>
          </div>
          <Link
            href="/catalog"
            className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-[#8A4A2C] hover:underline"
          >
            Открыть каталог
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((craft) => (
            <CraftCard key={craft.slug} craft={craft} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/inventory"
          className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5 transition hover:-translate-y-0.5 hover:shadow-soft"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-mist-soft text-[#4A6D8C]">
            <Boxes className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-bold">Мои запасы</span>
            <span className="block text-sm text-ink-soft">
              Что уже есть на полке и что пора докупить
            </span>
          </span>
          <ArrowRight className="ml-auto h-5 w-5 text-ink-soft transition group-hover:translate-x-1" />
        </Link>
        <div className="flex items-center gap-4 rounded-2xl bg-sage-soft p-5 ring-1 ring-sage/30">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#55693F]">
            <Hammer className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-bold">Режим мастера</span>
            <span className="block text-sm text-[#55693F]/90">
              Один шаг на экран, таймер и подсказки — открывается из любого
              мастер-класса
            </span>
          </span>
        </div>
      </section>

      {/* Коротко о мастерской: цифры одной строкой внизу, вместо крупных карточек в хиро */}
      <footer
        aria-label="Коротко о мастерской"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink/10 pt-4 text-sm text-ink-soft"
      >
        <span className="font-semibold text-ink">{crafts.length}</span> мастер-классов
        <span aria-hidden>·</span>
        <span className="font-semibold text-ink">{easy}</span> для новичков
        <span aria-hidden>·</span>
        средний чек
        <span className="font-semibold text-ink">
          {formatRub(
            crafts.reduce((s, c) => s + craftCost(c), 0) / crafts.length
          )}
        </span>
      </footer>
    </div>
  );
}
