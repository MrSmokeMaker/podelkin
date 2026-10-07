import type { Metadata } from "next";
import { ExportClient } from "./_components/export-client";

export const metadata: Metadata = {
  title: "Экспорт",
  description:
    "Выгрузка сводки мастерской: .txt для всех тарифов, детальный .csv для Premium.",
};

export default function ExportPage() {
  return <ExportClient />;
}
