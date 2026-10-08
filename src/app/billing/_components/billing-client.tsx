"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  CreditCard,
  Lock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import {
  PLAN_LABELS,
  PLAN_PRICES,
  type Role,
} from "@/lib/feature-flags";

interface PlanInfo {
  role: Role;
  price: number;
  tagline: string;
  perks: string[];
}

const PLANS: PlanInfo[] = [
  {
    role: "basic",
    price: PLAN_PRICES.basic,
    tagline: "Попробовать мастерскую",
    perks: [
      "Генерация поделок с ИИ — 3 в день",
      "Все мастер-классы и каталог источников",
      "3 проекта и 3 коллекции одновременно",
      "Список покупок и учёт запасов",
      "Экспорт сводки .txt",
    ],
  },
  {
    role: "premium",
    price: PLAN_PRICES.premium,
    tagline: "Для тех, кто творит постоянно",
    perks: [
      "Генерация с ИИ — 15 в день",
      "10 проектов и 20 коллекций",
      "Расширенная аналитика мастерской",
      "Экспорт .csv: время и стоимость по шагам",
      "Офлайн-доступ и приоритетная поддержка",
    ],
  },
  {
    role: "director",
    price: PLAN_PRICES.director,
    tagline: "Полный контроль мастерской",
    perks: [
      "Генерация с ИИ — 60 в день",
      "Проекты и коллекции без лимитов",
      "Аналитика ИИ: вызовы, кэш, рендеры",
      "Полный бэкап мастерской .json",
      "Контроль seed картинок и всё из Премиума",
    ],
  },
];

const TEST_CARD = "4242 4242 4242 4242";

export function BillingClient() {
  const router = useRouter();
  const showToast = useToast();
  const { user, loading } = useSession();
  const { role: currentRole } = useFeatureFlags();
  const [checkoutPlan, setCheckoutPlan] = useState<Role | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Тарифы и оплата
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Генерация поделок с ИИ есть во всех тарифах — отличается только дневной
          лимит и возможности мастерской
        </p>
      </header>

      {!loading && !user && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand-soft p-4 text-sm font-medium text-[#8A6A2F]">
          <Lock className="h-5 w-5 shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            Чтобы оформить платный тариф, войдите или создайте аккаунт.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-clay px-4 py-2 text-xs font-bold text-paper transition hover:bg-[#B06A48]"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#8A4A2C] ring-1 ring-ink/10 transition hover:bg-clay-soft/60"
          >
            Регистрация
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.role === currentRole;
          return (
            <section
              key={plan.role}
              aria-label={`Тариф ${PLAN_LABELS[plan.role]}`}
              className={`flex flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ${
                isCurrent ? "ring-2 ring-clay" : "ring-ink/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{PLAN_LABELS[plan.role]}</h2>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-1 text-[11px] font-bold text-[#55693F]">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                    Ваш тариф
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-ink-soft">{plan.tagline}</p>
              <p className="mt-3 text-2xl font-bold">
                {plan.price === 0 ? "0 ₽" : `${plan.price} ₽`}
                <span className="text-sm font-medium text-ink-soft"> / месяц</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#55693F]"
                      aria-hidden
                    />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              {plan.role === "premium" && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#DDB771]/15 to-[#C98DA4]/15 px-3 py-2 text-xs font-semibold text-[#8A4A2C]">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Хит: оптимальный баланс цены и лимитов
                </p>
              )}
              <button
                type="button"
                disabled={isCurrent || !user}
                onClick={() => setCheckoutPlan(plan.role)}
                className={`mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${
                  isCurrent
                    ? "bg-ink/10 text-ink-soft"
                    : plan.price === 0
                      ? "bg-white text-[#8A4A2C] ring-1 ring-clay hover:bg-clay-soft/40"
                      : "bg-clay text-paper shadow-card hover:bg-[#B06A48]"
                } disabled:opacity-70`}
              >
                {isCurrent
                  ? "Активен"
                  : plan.price === 0
                    ? "Перейти на Базовый"
                    : user
                      ? "Оформить"
                      : "Требуется вход"}
              </button>
            </section>
          );
        })}
      </div>

      {!loading && user && user.payments.length > 0 && (
        <section
          aria-label="История платежей"
          className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink/5"
        >
          <h2 className="text-lg font-bold">История платежей</h2>
          <ul className="mt-3 divide-y divide-ink/5">
            {user.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-semibold">
                  {PLAN_LABELS[payment.plan]} · {payment.amount} ₽
                </span>
                <span className="text-xs text-ink-soft">
                  Карта ••{payment.cardLast4} ·{" "}
                  {new Date(payment.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    payment.status === "paid"
                      ? "bg-sage-soft text-[#55693F]"
                      : "bg-blush-soft text-[#9C5570]"
                  }`}
                >
                  {payment.status === "paid" ? "Оплачен" : "Отказ"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-2xl bg-mist-soft/60 p-4 text-xs leading-relaxed text-ink-soft">
        Демо-оплата работает без реального банка: карта {TEST_CARD}, любой срок и
        CVC — платёж пройдёт; номер, оканчивающийся на «0000», имитирует отказ.
        Данные карты не сохраняются — только последние 4 цифры для истории.
      </p>

      {checkoutPlan && (
        <CheckoutModal
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onDone={(label) => {
            setCheckoutPlan(null);
            showToast("Тариф обновлён", `Активен тариф «${label}»`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CheckoutModal({
  plan,
  onClose,
  onDone,
}: {
  plan: Role;
  onClose: () => void;
  onDone: (label: string) => void;
}) {
  const { refresh } = useSession();
  const price = PLAN_PRICES[plan];
  const isFree = price === 0;
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const inputClass =
    "min-h-12 w-full rounded-xl border border-ink/10 bg-white px-4 text-sm outline-none transition focus:border-clay";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          card: isFree ? undefined : { number, expiry, cvc, holder },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Оплата не прошла");
        return;
      }
      await refresh();
      onDone(PLAN_LABELS[plan]);
    } catch {
      setError("Ошибка сети. Проверьте соединение и попробуйте снова");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFree ? "Смена тарифа" : `Оплата тарифа ${PLAN_LABELS[plan]}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-paper p-6 shadow-soft sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {isFree ? "Смена тарифа" : `Оплата — ${PLAN_LABELS[plan]}`}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {isFree
                ? "Тариф «Базовый» бесплатный: лимиты вернутся к базовым."
                : `${price} ₽ / месяц · тариф «${PLAN_LABELS[plan]}»`}
            </p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-[#55693F]">
            {isFree ? (
              <BadgeCheck className="h-5 w-5" aria-hidden />
            ) : (
              <ShieldCheck className="h-5 w-5" aria-hidden />
            )}
          </span>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {!isFree && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Номер карты</span>
                <input
                  required
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder={TEST_CARD}
                  value={number}
                  onChange={(event) =>
                    setNumber(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16)
                        .replace(/(\d{4})(?=\d)/g, "$1 ")
                    )
                  }
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Срок</span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="ММ/ГГ"
                    value={expiry}
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                      setExpiry(
                        digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
                      );
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">CVC</span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="123"
                    value={cvc}
                    onChange={(event) =>
                      setCvc(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">
                  Владелец карты
                </span>
                <input
                  required
                  autoComplete="cc-name"
                  placeholder="IVAN IVANOV"
                  value={holder}
                  onChange={(event) => setHolder(event.target.value)}
                  className={inputClass}
                />
              </label>
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-[#F6E3E8] px-4 py-3 text-sm font-medium text-[#9C5570]"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={pending}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-5 py-3 text-sm font-semibold text-paper shadow-card transition hover:bg-[#B06A48] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              {pending
                ? "Обрабатываем…"
                : isFree
                  ? "Подтвердить"
                  : `Оплатить ${price} ₽`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-12 items-center justify-center rounded-xl bg-ink/5 px-5 py-3 text-sm font-semibold text-ink-soft transition hover:bg-ink/10"
            >
              Отмена
            </button>
          </div>
          {!isFree && (
            <p className="text-center text-xs text-ink-soft">
              Демо: подойдут тестовые карты, данные никуда не уходят
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

