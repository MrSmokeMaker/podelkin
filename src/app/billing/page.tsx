import type { Metadata } from "next";
import { BillingClient } from "./_components/billing-client";

export const metadata: Metadata = {
  title: "Тарифы и оплата",
  description:
    "Тарифы Podelkin: Базовый (бесплатно), Премиум и Директор. Генерация поделок с ИИ — во всех тарифах.",
};

export default function BillingPage() {
  return <BillingClient />;
}
