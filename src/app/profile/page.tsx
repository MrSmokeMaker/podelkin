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
      label: "Доски",
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

  const links = [
    { href: "/podelki", label: "Мои поделки", icon: Shapes },
    { href: "/podelki/favorites", label: "Избранное", icon: Heart },
    { href: "/boards", label: "Доски настроений", icon: Layers },
    { href: "/inventory", label: "Запасы", icon: Boxes },
    { href: "/generate", label: "Сгенерировать с AI", icon: Sparkles },
    { href: "/export", label: "Экспорт данных", icon: Download },
    { href: "/stats", label: "Статистика", icon: ChartPie },
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

      <section aria-label="Быстрый доступ">
        <h2 className="text-lg font-bold">Быстрый доступ</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 ring-ink/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-deep/70 text-ink">
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
      </section>
    </div>
  );
}
