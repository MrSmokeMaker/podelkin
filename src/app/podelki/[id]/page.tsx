import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCatalogItem } from "@/lib/catalog-db";
import { DetailClient } from "./_components/detail-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = findCatalogItem(id);
  if (!item) return { title: "Поделка не найдена" };
  return {
    title: item.title,
    description:
      item.description || `Поделка «${item.title}» в каталоге поделок мастерской`,
  };
}

export default async function PodelkaPage({ params }: Props) {
  const { id } = await params;
  const item = findCatalogItem(id);
  if (!item) notFound();
  return <DetailClient item={item} />;
}
