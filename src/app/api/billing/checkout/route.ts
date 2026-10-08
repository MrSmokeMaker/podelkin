import { NextRequest, NextResponse } from "next/server";
import { PLAN_PRICES, ROLES, WEEKLY_PRICES, type PlanPeriod, type Role } from "@/lib/feature-flags";
import {
  SESSION_COOKIE,
  addPayment,
  chargeCard,
  getUserBySessionToken,
  setPlan,
  toPublicUser,
} from "@/lib/users";

export const dynamic = "force-dynamic";

/* Демо-оплата тарифа: месяц или еженедельная подписка (Премиум/Директор).
   Карта не сохраняется — только последние 4 цифры.
   Успешная карта: 4242 4242 4242 4242; номер на «0000» имитирует отказ банка.
   Смена на «Базовый» проходит без карты (отмена подписки). */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const current = token ? getUserBySessionToken(token) : null;
  if (!current) {
    return NextResponse.json(
      { error: "Войдите, чтобы изменить тариф" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ожидается JSON" }, { status: 400 });
  }

  const { plan, period, card } = (body ?? {}) as {
    plan?: unknown;
    period?: unknown;
    card?: {
      number?: unknown;
      expiry?: unknown;
      cvc?: unknown;
      holder?: unknown;
    };
  };

  if (typeof plan !== "string" || !(ROLES as string[]).includes(plan)) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }
  const target = plan as Role;

  /* Неделя — отдельный формат только для платных тарифов: можно подключать
     и к уже активному тарифу (это пакет, а не смена плана). */
  const billingPeriod: PlanPeriod = period === "week" ? "week" : "month";

  if (billingPeriod === "week" && target === "basic") {
    return NextResponse.json(
      { error: "Недельная подписка доступна в Премиуме и Директоре" },
      { status: 400 }
    );
  }

  if (target === current.plan && billingPeriod === "month") {
    return NextResponse.json(
      { error: "Этот тариф уже активен" },
      { status: 409 }
    );
  }

  const amount =
    billingPeriod === "week" ? WEEKLY_PRICES[target] : PLAN_PRICES[target];

  if (amount > 0) {
    const result = chargeCard({
      number: typeof card?.number === "string" ? card.number : "",
      expiry: typeof card?.expiry === "string" ? card.expiry : "",
      cvc: typeof card?.cvc === "string" ? card.cvc : "",
      holder: typeof card?.holder === "string" ? card.holder : "",
    });
    const last4 =
      typeof card?.number === "string"
        ? card.number.replace(/\D/g, "").slice(-4)
        : "0000";
    if (!result.ok) {
      addPayment(current.id, {
        id: `pay-${Date.now().toString(36)}`,
        plan: target,
        amount,
        status: "declined",
        cardLast4: last4,
        createdAt: new Date().toISOString(),
        period: billingPeriod,
      });
      return NextResponse.json({ error: result.reason }, { status: 402 });
    }
    addPayment(current.id, {
      id: `pay-${Date.now().toString(36)}`,
      plan: target,
      amount,
      status: "paid",
      cardLast4: last4,
      createdAt: new Date().toISOString(),
      period: billingPeriod,
    });
  }

  const updated = setPlan(current.id, target);
  if (!updated) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({ user: toPublicUser(updated), plan: target });
}
