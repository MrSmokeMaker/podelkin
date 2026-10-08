"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useSession();
  const showToast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось войти");
        return;
      }
      await refresh();
      showToast("Вход выполнен", `Рады видеть, ${data.user.name}`);
      router.push("/profile");
      router.refresh();
    } catch {
      setError("Ошибка сети. Проверьте соединение и попробуйте снова");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "min-h-12 w-full rounded-xl border border-ink/10 bg-white px-4 text-sm outline-none transition focus:border-clay";

  return (
    <form
      onSubmit={submit}
      className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-ink/5"
    >
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Пароль</span>
        <span className="relative block">
          <input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            className="absolute inset-y-0 right-3 flex items-center text-ink-soft hover:text-ink"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden />
            ) : (
              <Eye className="h-5 w-5" aria-hidden />
            )}
          </button>
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-[#F6E3E8] px-4 py-3 text-sm font-medium text-[#9C5570]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Входим…" : "Войти"}
      </button>

      <p className="text-center text-xs text-ink-soft">
        Забыли пароль?{" "}
        <Link href="/register" className="font-semibold text-[#8A4A2C] hover:underline">
          Создайте новый аккаунт
        </Link>
      </p>
    </form>
  );
}
