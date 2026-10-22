import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listCatalogItems } from "@/lib/catalog-db-server";

export const dynamic = "force-dynamic";

/* Эндпоинт для случайной поделки:
   - Доступен только для платных тарифов (Премиум и Директор).
   - Выбирает случайную поделку строго с сайта «Своими Руками» (svoimirukamy.com). */

export async function GET(request: Request) {
  const auth = getAuthUser(request);

  if (!auth.features.allowed.includes("randomCraft")) {
    return NextResponse.json(
      {
        error:
          "Функция «Случайная поделка» доступна только в платных тарифах (Премиум и Директор). Перейдите в раздел тарифов для подключения.",
        upgradeUrl: "/billing",
        code: "PREMIUM_REQUIRED",
      },
      { status: 403 }
    );
  }

  const allItems = await listCatalogItems();
  const svoimiRukamyItems = allItems.filter(
    (item) =>
      item.sourceName === "Своими Руками" ||
      item.sourceUrl.toLowerCase().includes("svoimirukamy.com")
  );

  if (svoimiRukamyItems.length === 0) {
    return NextResponse.json(
      { error: "Поделки с сайта «Своими Руками» пока не найдены." },
      { status: 404 }
    );
  }

  const randomIndex = Math.floor(Math.random() * svoimiRukamyItems.length);
  const selectedItem = svoimiRukamyItems[randomIndex];

  return NextResponse.json({
    item: selectedItem,
    totalAvailable: svoimiRukamyItems.length,
  });
}
