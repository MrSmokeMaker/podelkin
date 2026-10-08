import type { Metadata } from "next";
import { BoardsClient } from "./_components/boards-client";

export const metadata: Metadata = {
  title: "Коллекции",
  description:
    "Коллекции идей — подборки поделок под цель. Бесплатно — до 3 коллекций, Premium — до 20.",
};

export default function BoardsPage() {
  return <BoardsClient />;
}
