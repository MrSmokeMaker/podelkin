"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChartPie,
  Download,
  Layers,
  LayoutGrid,
  Plus,
  Scissors,
  Shapes,
  Sparkles,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/generate", label: "AI", icon: Sparkles },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/boards", label: "Доски", icon: Layers },
  { href: "/export", label: "Экспорт", icon: Download },
  { href: "/stats", label: "Статистика", icon: ChartPie },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

const mobileLinks = [
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/build", label: "Мастер", icon: Scissors },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/profile", label: "Профиль", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  if (href === "/build") return pathname.startsWith("/build");
  return pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/build/")) return null;

  const podelkiActive = pathname.startsWith("/podelki");

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
          <Link
            href="/podelki"
            aria-current={podelkiActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              podelkiActive
                ? "bg-clay-soft text-[#8A4A2C]"
                : "text-ink-soft hover:bg-clay-soft/60 hover:text-ink"
            )}
          >
            <Shapes className="h-5 w-5" />
            Поделки
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/build/")) return null;

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
      <div className="grid grid-cols-5">
        {mobileLinks.slice(0, 2).map(renderLink)}
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
