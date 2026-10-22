import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  listCatalogItems,
  findCatalogItemBySourceUrl,
  createCatalogItem,
} from "@/lib/catalog-db-server";
import { importCraftFromSource } from "@/server/services/sourceImport";
import type { CatalogDifficulty, CatalogItem } from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const LIVE_TARGETS = [
  "https://svoimirukamy.com/",
  "https://svoimirukamy.com/category/detskie-podelki",
  "https://svoimirukamy.com/category/podelki-iz-bumagi",
  "https://svoimirukamy.com/category/podelki-iz-prirodnyh-materialov",
  "https://svoimirukamy.com/category/podelki-dlya-doma",
  "https://svoimirukamy.com/category/cvety",
  "https://svoimirukamy.com/category/prazdniki/novogodnie-podelki",
  "https://svoimirukamy.com/category/prazdniki/podarki",
  "https://svoimirukamy.com/category/prazdniki/podelki-k-8-marta",
  "https://svoimirukamy.com/category/detskie-podelki/podelki-iz-plastelina",
  "https://svoimirukamy.com/category/podelki-iz-bisera",
  "https://svoimirukamy.com/category/ukrasheniya",
  "https://svoimirukamy.com/category/samodelnye-kukly",
  "https://svoimirukamy.com/category/podelki-dlya-dachi",
  "https://svoimirukamy.com/?s=%D0%BF%D0%BE%D0%B4%D0%B5%D0%BB%D0%BA%D0%B8",
  "https://svoimirukamy.com/?s=%D0%B1%D1%83%D0%BC%D0%B0%D0%B3%D0%B8",
  "https://svoimirukamy.com/?s=%D0%BA%D0%B0%D1%80%D1%82%D0%BE%D0%BD",
  "https://svoimirukamy.com/?s=%D0%BF%D0%BB%D0%B0%D1%81%D1%82%D0%B8%D0%BB%D0%B8%D0%BD",
  "https://svoimirukamy.com/?s=%D1%86%D0%B2%D0%B5%D1%82%D1%8B",
  "https://svoimirukamy.com/?s=%D0%B8%D0%B3%D1%80%D1%83%D1%88%D0%BA%D0%B8",
  "https://svoimirukamy.com/?s=%D0%BE%D1%82%D0%BA%D1%80%D1%8B%D1%82%D0%BA%D0%B0",
];

/* Загрузка случайной статьи напрямую с сайта svoimirukamy.com */
async function fetchDirectFromSvoimiRukamy(): Promise<CatalogItem | null> {
  const target = LIVE_TARGETS[Math.floor(Math.random() * LIVE_TARGETS.length)];
  const res = await fetch(target, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;
  const html = await res.text();

  const regex =
    /<h2[^>]*class="[^"]*entry-title[^"]*"[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>/gi;
  const matches = [...html.matchAll(regex)].map((m) => m[1]);
  const articleUrls = [
    ...new Set(
      matches.filter(
        (url) => url.includes("svoimirukamy.com") && url.endsWith(".html")
      )
    ),
  ];

  if (articleUrls.length === 0) return null;

  const chosenUrl =
    articleUrls[Math.floor(Math.random() * articleUrls.length)];

  // Если поделка уже есть в базе, возвращаем её
  const existing = await findCatalogItemBySourceUrl(chosenUrl);
  if (existing) return existing;

  // Иначе парсим напрямую со страницы svoimirukamy.com и сохраняем
  const imported = await importCraftFromSource(new URL(chosenUrl));
  const stepCount = imported.instructions.length;
  const difficulty: CatalogDifficulty =
    stepCount >= 8
      ? "сложно"
      : stepCount > 0 && stepCount <= 4
        ? "легко"
        : "средне";

  return await createCatalogItem({
    title: imported.title,
    category: imported.category,
    sourceUrl: chosenUrl,
    description: imported.description,
    difficulty,
    materials: imported.materials,
    instructions: imported.instructions,
    assemblyTime: imported.assemblyTime,
    thumbnail: imported.imageUrl,
    templateUrl: null,
    tags: ["своими руками", "живой поиск"],
  });
}

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

  try {
    // 1. Пробуем получить случайную поделку напрямую с сайта svoimirukamy.com
    const liveItem = await fetchDirectFromSvoimiRukamy().catch(() => null);
    if (liveItem) {
      return NextResponse.json({
        item: liveItem,
        source: "live_svoimirukamy",
      });
    }

    // 2. Фолбэк на ранее сохранённые поделки со «Своими Руками», если сайт не ответил
    const allItems = await listCatalogItems();
    const svoimiRukamyItems = allItems.filter(
      (item) =>
        item.sourceName === "Своими Руками" ||
        item.sourceUrl.toLowerCase().includes("svoimirukamy.com")
    );

    if (svoimiRukamyItems.length > 0) {
      const randomIndex = Math.floor(
        Math.random() * svoimiRukamyItems.length
      );
      return NextResponse.json({
        item: svoimiRukamyItems[randomIndex],
        source: "catalog_fallback",
      });
    }

    return NextResponse.json(
      { error: "Не удалось получить поделку с сайта «Своими Руками»." },
      { status: 502 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
