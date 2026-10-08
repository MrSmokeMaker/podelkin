import type { Metadata } from "next";
import { BoardsClient } from "./_components/boards-client";

export const metadata: Metadata = {
  title: "Коллекции",
  description:
    "Коллекции идей — подборки поделок под цель. Базовый — до 3 коллекций, Премиум — до 20, Директор — до 100.",
};

export default function BoardsPage() {
  return <BoardsClient />;
}
