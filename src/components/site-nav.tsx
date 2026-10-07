"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ChartPie, House, LayoutGrid, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Главная", icon: House },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/stats", label: "Статистика", icon: ChartPie },
];

const mobileLinks = [
  { href: "/", label: "Главная", icon: House },
  { href: "/catalog", label: "Каталог", icon: LayoutGrid },
  { href: "/build", label: "Мастер", icon: Scissors },
  { href: "/inventory", label: "Запасы", icon: Boxes },
  { href: "/stats", label: "Статистика", icon: ChartPie },
];

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/build/")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
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
                  "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
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
              className={cn(
                "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-[#8A4A2C]" : "text-ink-soft"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-clay")}
                strokeWidth={active ? 2.4 : 2}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
