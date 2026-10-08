"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Layers,
  LayoutGrid,
  LogIn,
  Plus,
  Scissors,
  Settings,
  ShoppingCart,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session-provider";

/* Экспорт и статистика переехали в Профиль → «Настройки» (по брифу). */
const links = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/generate", label: "AI", icon: Sparkles },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/boards", label: "Папки", icon: Layers },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

const mobileLinks = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/shopping-list", label: "Покупки", icon: ShoppingCart },
  { href: "/settings", label: "Настройки", icon: Settings },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-2 px-4">
        <Link
          href="/"
          aria-label="Podelkin — на главную"
          className="flex items-center gap-2.5 py-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay text-paper shadow-card">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">Podelkin</span>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex" aria-label="Основная">
            {links.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:px-4",
                    active
                      ? "bg-clay-soft text-[#8A4A2C]"
                      : "text-ink-soft hover:bg-clay-soft/60 hover:text-ink"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          {user ? (
            <Link
              href="/profile"
              aria-label={`Профиль: ${user.name}`}
              className="flex min-h-10 items-center gap-2 rounded-xl bg-clay-soft px-2.5 py-1.5 text-sm font-semibold text-[#8A4A2C] transition hover:bg-[#F3E2D3]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay text-[11px] font-bold text-paper">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden max-w-24 truncate lg:inline">{user.name}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex min-h-10 items-center gap-1.5 rounded-xl bg-clay px-3.5 py-2 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48]"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const renderLink = ({ href, label, icon: Icon }: (typeof mobileLinks)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors active:scale-[0.97]",
          active ? "text-[#8A4A2C]" : "text-ink-soft"
        )}
      >
        <span
          className={cn(
            "flex h-9 w-14 items-center justify-center rounded-2xl transition-shadow",
            active ? "bg-clay-soft shadow-card" : "bg-transparent"
          )}
        >
          <Icon
            className={cn("h-6 w-6", active && "text-clay")}
            strokeWidth={active ? 2.6 : 2}
          />
        </span>
        {label}
      </Link>
    );
  };

  const generateActive = pathname.startsWith("/generate");

  return (
    <nav
      aria-label="Основная (мобильная)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-soft backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-6">
        {mobileLinks.slice(0, 1).map(renderLink)}
        <Link
          href="/generate"
          aria-label="Сгенерировать поделку"
          aria-current={generateActive ? "page" : undefined}
          className="flex min-h-16 items-center justify-center"
        >
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full bg-clay text-paper shadow-card transition-transform active:scale-95",
              generateActive && "ring-2 ring-clay/40 ring-offset-2 ring-offset-paper"
            )}
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} />
          </span>
        </Link>
        {mobileLinks.slice(2).map(renderLink)}
      </div>
    </nav>
  );
}
