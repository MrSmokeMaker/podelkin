import type { Metadata } from "next";
import { ShoppingListClient } from "./_components/shopping-list-client";

export const metadata: Metadata = {
  title: "Список покупок",
  description:
    "Единый список покупок мастерской: низкие остатки из запасов и недостающие материалы поделок в одном месте.",
};

export default function ShoppingListPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Список покупок
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Материалы из генераций, источников и новых поделок попадают сюда сами
        </p>
      </header>
      <ShoppingListClient />
    </div>
  );
}
