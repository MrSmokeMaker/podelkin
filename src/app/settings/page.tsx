import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChartPie, CreditCard, Smartphone } from "lucide-react";

export const metadata: Metadata = {
  title: "Настройки",
  description:
    "Настройки Podelkin: тариф и оплата, экспорт данных мастерской, статистика.",
};

/* Переехали из Профиля: тариф, выгрузка и статистика — один раздел. */
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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Настройки</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Тариф, выгрузка данных и статистика мастерской
        </p>
      </header>

      <section aria-label="Настройки мастерской">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
