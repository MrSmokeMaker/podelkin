import type { Metadata } from "next";
import { FavoritesClient } from "./_components/favorites-client";

export const metadata: Metadata = {
  title: "Избранные поделки",
  description:
    "Поделки, отмеченные сердечком: хранятся на устройстве, доступны без интернета.",
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
