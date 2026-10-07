import type { Metadata } from "next";
import { NewPodelkaClient } from "./_components/new-podelka-client";

export const metadata: Metadata = {
  title: "Добавить поделку",
  description:
    "Добавьте поделку из only-paper.ru или 1001zagotovka.ru в каталог: превью, материалы, шаблон.",
};

export default function NewPodelkaPage() {
  return <NewPodelkaClient />;
}
