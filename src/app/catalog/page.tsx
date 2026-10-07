import type { Metadata } from "next";
import { CatalogClient } from "./_components/catalog-client";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Все мастер-классы по рукоделию: фильтры по категории, сложности и бюджету.",
};

export default function CatalogPage() {
  return <CatalogClient />;
}
