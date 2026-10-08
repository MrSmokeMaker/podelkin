import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChartPie,
  Download,
  Hammer,
  Heart,
  Layers,
  Shapes,
  Sparkles,
} from "lucide-react";
import { aiCrafts, boards, crafts, inventory, projects } from "@/lib/db";
import { ProfileCard } from "./_components/profile-card";

export const metadata: Metadata = {
  title: "Профиль",
  description:
    "Ваш профиль в мастерской: проекты, тариф, избранное и быстрый доступ к разделам.",
};

const createLinks = [
  {
    href: "/generate",
    label: "Сгенерировать с AI",
    subtitle: "Новый мастер-класс по вашему описанию",
    icon: Sparkles,
  },
  {
    href: "/podelki",
    label: "Мои поделки",
    subtitle: "Все ваши созданные работы",
    icon: Shapes,
  },
  {
    href: "/podelki/favorites",
    label: "Избранное",
    subtitle: "Идеи, отложенные на потом",
    icon: Heart,
  },
  {
    href: "/boards",
    label: "Коллекции идей",
    subtitle: "Подборки под цель: кухня, подарки, детская",
    icon: Layers,
  },
];

const manageLinks = [
  {
    href: "/inventory",
    label: "Запасы",
    subtitle: "Что на полке и что пора докупить",
    icon: Boxes,
    hint: "Остатки материалов и низкие запасы",
  },
  {
    href: "/export",
    label: "Экспорт данных",
    subtitle: "Скачать проекты и списки в TXT",
    icon: Download,
    hint: "Выгрузка мастерской в текстовый файл",
  },
  {
    href: "/stats",
    label: "Статистика",
    subtitle: "Прогресс мастерской в цифрах",
    icon: ChartPie,
    hint: "Сколько сделано и что в планах",
  },
];

export default function ProfilePage() {
  const inProgress = projects.filter((p) => p.status === "в работе").length;
  const done = projects.filter((p) => p.status === "готов").length;

  const stats = [
    {
      icon: Hammer,
      tint: "bg-clay-soft text-[#8A4A2C]",
      label: "В работе",
      value: String(inProgress),
    },
    {
      icon: Sparkles,
      tint: "bg-mist-soft text-[#4A6D8C]",
      label: "Завершено",
      value: String(done),
    },
    {
      icon: Layers,
      tint: "bg-sand-soft text-[#8A6A2F]",
      label: "Коллекции",
      value: String(boards.length),
    },
    {
      icon: Boxes,
      tint: "bg-sage-soft text-[#55693F]",
      label: "Позиций в запасах",
      value: String(inventory.length),
    },
    {
      icon: Heart,
      tint: "bg-blush-soft text-[#8A4A5C]",
      label: "Мастер-классов всего",
      value: String(crafts.length + aiCrafts.length),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Профиль</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Мастерская, тариф и всё ваше — в одном месте
        </p>
      </header>

      <ProfileCard />

      <section aria-label="Мастерская в цифрах">
        <h2 className="text-lg font-bold">Мастерская в цифрах</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ icon: Icon, tint, label, value }) => (
            <div
              key={label}
              className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3 text-2xl font-bold leading-none">{value}</p>
              <p className="mt-1.5 text-xs font-medium text-ink-soft">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Создание">
        <h2 className="text-lg font-bold">Создание</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/generate"
            className="group flex items-center gap-4 rounded-2xl bg-clay p-6 shadow-soft ring-1 ring-clay transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B06A48] active:translate-y-0"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-paper">
              <Sparkles className="h-7 w-7 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-paper">
                Сгенерировать с AI
              </span>
              <span className="mt-0.5 block text-sm text-paper/80">
                Новый мастер-класс по вашему описанию
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-paper/70 transition group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          <Link
            href="/podelki"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-soft ring-2 ring-clay/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 sm:col-span-2"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-[#8A4A2C]">
              <Shapes className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">Мои поделки</span>
              <span className="mt-0.5 block text-sm text-ink-soft">
                Все ваши созданные работы
              </span>
            </span>
            <ArrowRight
              className="h-5 w-5 shrink-0 text-ink-soft transition group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
          {createLinks.slice(2).map(({ href, label, subtitle, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep/70 text-ink">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {label}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">
                  {subtitle}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>

      <hr className="border-ink/10" />

      <section aria-label="Управление">
        <h2 className="text-lg font-bold">Управление</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {manageLinks.map(({ href, label, subtitle, icon: Icon, hint }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep/70 text-ink">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{label}</span>
                  <span
                    title={hint}
                    aria-label={hint}
                    className="flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full bg-paper-deep text-[10px] font-bold text-ink-soft"
                  >
                    ?
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">
                  {subtitle}
                </span>
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
