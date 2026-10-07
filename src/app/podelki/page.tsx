import type { Metadata } from "next";
import { PodelkiClient } from "./_components/podelki-client";

export const metadata: Metadata = {
  title: "Каталог поделок",
  description:
    "Бумажные модели с only-paper.ru и деревянные заготовки с 1001zagotovka.ru: фильтры по категории, сложности и источнику.",
};

export default function PodelkiPage() {
  return <PodelkiClient />;
}
