import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { RegisterForm } from "./_components/register-form";

export const metadata: Metadata = {
  title: "Регистрация",
  description:
    "Создайте аккаунт Podelkin: тариф «Базовый» бесплатный, генерация поделок с ИИ доступна сразу.",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-soft text-[#8A4A2C] shadow-card">
          <UserPlus className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          Создать аккаунт
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Тариф «Базовый» — бесплатный. Генерация поделок с ИИ доступна сразу.
        </p>
      </div>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Уже с нами?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#8A4A2C] underline-offset-4 hover:underline"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}
