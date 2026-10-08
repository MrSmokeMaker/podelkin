import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PLAN_RANK, type Role } from "@/lib/feature-flags";

/* Пользователи и сессии в памяти: как и весь слой данных приложения,
   заменяют PostgreSQL + Prisma в среде без сети. Пароли — scrypt,
   сессия — случайный токен в httpOnly-cookie. */

export interface PaymentRecord {
  id: string;
  plan: Role;
  amount: number;
  status: "paid" | "declined";
  cardLast4: string;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  plan: Role;
  payments: PaymentRecord[];
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  plan: Role;
  createdAt: string;
  payments: PaymentRecord[];
}

const users: StoredUser[] = [];
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export const SESSION_COOKIE = "podelkin_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString("hex");
}

export function createUser(input: {
  name: string;
  email: string;
  password: string;
}): StoredUser {
  const email = input.email.trim().toLowerCase();
  if (users.some((u) => u.email === email)) {
    throw new Error("email-taken");
  }
  const salt = randomBytes(16).toString("hex");
  const user: StoredUser = {
    id: `u-${randomBytes(6).toString("hex")}`,
    name: input.name.trim(),
    email,
    salt,
    passwordHash: hashPassword(input.password, salt),
    plan: "basic",
    payments: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

export function verifyCredentials(email: string, password: string): StoredUser | null {
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  if (!user) return null;
  const attempt = Buffer.from(hashPassword(password, user.salt), "hex");
  const actual = Buffer.from(user.passwordHash, "hex");
  return attempt.length === actual.length && timingSafeEqual(attempt, actual)
    ? user
    : null;
}

export function createSession(userId: string): string {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function deleteSession(token: string): void {
  sessions.delete(token);
}

export function getUserBySessionToken(token: string): StoredUser | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return users.find((u) => u.id === session.userId) ?? null;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    createdAt: user.createdAt,
    payments: user.payments.slice(-5).reverse(),
  };
}

export function setPlan(userId: string, plan: Role): StoredUser | null {
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  user.plan = plan;
  return user;
}

export function addPayment(userId: string, payment: PaymentRecord): void {
  const user = users.find((u) => u.id === userId);
  if (user) user.payments.push(payment);
}

/* Демо-эквайринг: карта из 16 цифр проходит, номер на «0000» имитирует отказ.
   Настоящий платёжный шлюз появится здесь же — вместо chargeCard(). */
export function chargeCard(input: {
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
}): { ok: true } | { ok: false; reason: string } {
  const number = input.number.replace(/\s/g, "");
  if (!/^\d{16}$/.test(number)) return { ok: false, reason: "Номер карты — 16 цифр" };
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(input.expiry)) {
    return { ok: false, reason: "Срок действия в формате ММ/ГГ" };
  }
  if (!/^\d{3,4}$/.test(input.cvc)) return { ok: false, reason: "CVC — 3 цифры" };
  if (input.holder.trim().length < 2) {
    return { ok: false, reason: "Укажите имя владельца карты" };
  }
  if (number.endsWith("0000")) {
    return { ok: false, reason: "Банк отклонил операцию (демо-отказ)" };
  }
  return { ok: true };
}

export function planAllowsUpgrade(current: Role, target: Role): boolean {
  return PLAN_RANK[target] > PLAN_RANK[current];
}
