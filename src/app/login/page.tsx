import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Вход",
  description:
    "Войдите в мастерскую Podelkin: свои поделки, запасы, тарифы и генерация идей с ИИ.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-[#8A4A2C] shadow-card">
          <LogIn className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          С возвращением
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Войдите, чтобы продолжить свои проекты и управлять тарифом
        </p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Ещё нет аккаунта?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#8A4A2C] underline-offset-4 hover:underline"
        >
          Зарегистрироваться
        </Link>
      </p>
    </div>
  );
}
