import type { Metadata } from "next";
import { BoardsClient } from "./_components/boards-client";

export const metadata: Metadata = {
  title: "Доски",
  description:
    "Доски настроения с подборками поделок. Бесплатно — до 3 досок, Premium — до 20.",
};

export default function BoardsPage() {
  return <BoardsClient />;
}
