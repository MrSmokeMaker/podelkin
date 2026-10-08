import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChartPie,
  CreditCard,
  Hammer,
  Heart,
  Layers,
  Lightbulb,
  PenLine,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { aiCrafts, boards, crafts, inventory, projects } from "@/lib/db";
import { ProfileCard } from "./_components/profile-card";

export const metadata: Metadata = {
  title: "Профиль",
  description:
    "Ваш профиль в мастерской: быстрые действия, настройки и прогресс.",
};

/* «Действия» — три главных сценария из брифа, больше ничего лишнего. */
const actions = [
  { href: "/catalog", label: "Найти идею", icon: Lightbulb },
  { href: "/generate?tab=manual", label: "Записать поделку", icon: PenLine },
  { href: "/inventory", label: "Проверить запасы", icon: Boxes },
];

const secondaryLinks = [
  { href: "/podelki/favorites", label: "Избранное", icon: Heart },
  { href: "/boards", label: "Папки с идеями", icon: Layers },
];

const settingsLinks = [
  {
    href: "/billing",
    label: "Тарифы и оплата",
    subtitle: "Базовый, Премиум и Директор — сравнить и подключить",
    icon: CreditCard,
    hint: "Генерация с ИИ есть во всех тарифах",
  },
  {
    href: "/export",
    label: "Сохранить в телефон",
    subtitle: "Скачать проекты и списки на устройство",
    icon: Smartphone,
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
      label: "Папки",
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
          Действия, настройки и всё ваше — в одном месте
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

      <section aria-label="Действия">
        <h2 className="text-lg font-bold">Действия</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {actions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-[#8A4A2C]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {label}
              </span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:translate-x-1"
                aria-hidden
              />
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {secondaryLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A4A2C] hover:underline"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <hr className="border-ink/10" />

      <section aria-label="Настройки">
        <h2 className="text-lg font-bold">Настройки</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {settingsLinks.map(({ href, label, subtitle, icon: Icon, hint }) => (
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
