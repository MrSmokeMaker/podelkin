import type { Metadata } from "next";
import { crafts, getCraft } from "@/lib/crafts";
import { BuildClient } from "./_components/build-client";

export function generateStaticParams() {
  return crafts.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const craft = getCraft(slug);
  if (!craft) return { title: "Не найдено" };
  return { title: `Мастер: ${craft.title}`, description: craft.description };
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const craft = getCraft(slug);
  if (!craft) notFound();
  return <BuildClient slug={craft.slug} />;
}
