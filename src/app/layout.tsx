import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { cn } from "@/lib/utils";
import { ToastProvider } from "@/components/toast";
import { BottomNav, SiteHeader } from "@/components/site-nav";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Рукоделие — мастерская идей",
    template: "%s — Рукоделие",
  },
  description:
    "Пошаговые мастер-классы по рукоделию: керамика, дерево, пряжа, свечи и не только. Списки покупок, запасы и статистика мастерской.",
  applicationName: "Рукоделие",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#F7F2EA",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={cn(
          "paper-texture min-h-dvh bg-paper font-sans text-ink antialiased",
          GeistSans.variable,
          GeistMono.variable
        )}
      >
        <ToastProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:pb-16">
            {children}
          </main>
          <BottomNav />
          <PwaRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
