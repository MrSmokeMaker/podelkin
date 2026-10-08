import type { Metadata } from "next";
import { InstallBanner } from "../podelki/_components/install-banner";
import { GenerateTabs } from "./_components/generate-tabs";

export const metadata: Metadata = {
  title: "Создать поделку",
  description:
    "Два способа: опишите тему — ИИ подготовит черновик мастер-класса, или добавьте поделку вручную по ссылке на источник.",
};

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function GeneratePage({ searchParams }: Props) {
  const { tab } = await searchParams;
  return (
    <div className="space-y-6">
      <GenerateTabs initialTab={tab === "manual" ? "manual" : "ai"} />
      <InstallBanner />
    </div>
  );
}
