"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  ChartPie,
  Download,
  House,
  Layers,
  LayoutGrid,
  Scissors,
  Shapes,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Главная", icon: House },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/podelki", label: "Поделки", icon: Shapes },
  { href: "/generate", label: "AI", icon: Sparkles },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/boards", label: "Доски", icon: Layers },
  { href: "/export", label: "Экспорт", icon: Download },
  { href: "/stats", label: "Статистика", icon: ChartPie },
];

const mobileLinks = [
  { href: "/", label: "Главная", icon: House },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/build", label: "Мастер", icon: Scissors },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/podelki", label: "Поделки", icon: Shapes },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/build/")) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-paper/90 backdrop-blur transition-shadow",
        scrolled
          ? "border-ink/10 shadow-card"
          : "border-transparent shadow-none"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay text-paper shadow-card">
            <Scissors className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">Рукоделие</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Основная">
          {links.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
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
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/build/")) return null;

  return (
    <nav
      aria-label="Основная (мобильная)"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5">
        {mobileLinks.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : href === "/build"
                ? pathname.startsWith("/build")
                : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-[#8A4A2C]" : "text-ink-soft"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-14 items-center justify-center rounded-full transition-colors",
                  active && "bg-clay-soft"
                )}
              >
                <Icon
                  className={cn("h-5 w-5", active && "text-clay")}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
