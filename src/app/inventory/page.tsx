import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { inventory } from "@/lib/crafts";
import { InventoryClient } from "./_components/inventory-client";

export const metadata: Metadata = {
  title: "Запасы",
  description:
    "Что уже есть в мастерской: материалы, инструменты и остатки по каждому наименованию.",
};

export default function InventoryPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Мои запасы
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {inventory.length} наименований на складе мастерской. Нажмите на
          карточку, чтобы списать материал или докупить его.
        </p>
      </header>

      <InventoryClient items={inventory} />

      <p className="flex items-center gap-2 text-xs text-ink-soft">
        <Boxes className="h-4 w-4" />
        Запасы — демо-данные: сравнение с потребностями мастер-классов идёт
        автоматически.
      </p>
    </div>
  );
}
