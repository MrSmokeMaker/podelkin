import { NextRequest, NextResponse } from "next/server";
import { decodeEntities } from "@/server/services/sourceFetcher";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8_000;
const RESULTS_PER_SITE = 8;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface Suggestion {
  url: string;
  title: string;
  site: string;
  siteLabel: string;
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, 80);

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Введите минимум 2 символа для поиска" },
      { status: 400 }
    );
  }

  const results: Suggestion[] = [];
  const failed: string[] = [];

  const [zagotovkaRes, onlyPaperRes] = await Promise.allSettled([
    search1001Zagotovka(query),
    searchOnlyPaper(query),
  ]);

  if (zagotovkaRes.status === "fulfilled") {
    results.push(...zagotovkaRes.value);
  } else {
    failed.push("1001zagotovka.ru");
  }

  if (onlyPaperRes.status === "fulfilled") {
    results.push(...onlyPaperRes.value);
  } else {
    failed.push("only-paper.ru");
  }

  return NextResponse.json(
    { results, failed },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* 1001zagotovka.ru — OpenCart интернет-магазин заготовок.
   URL поиска: /index.php?route=product/search&search=... */
async function search1001Zagotovka(query: string): Promise<Suggestion[]> {
  const url = `https://1001zagotovka.ru/index.php?route=product/search&search=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error("1001zagotovka failed");
  const html = await res.text();

  const out: Suggestion[] = [];
  const seen = new Set<string>();

  const regex = /<div class="product-thumb"[\s\S]*?<a itemprop="url" href="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null && out.length < RESULTS_PER_SITE) {
    const itemUrl = match[1];
    const rawTitle = decodeEntities(match[2]).trim();
    if (!itemUrl || !rawTitle || seen.has(itemUrl)) continue;
    seen.add(itemUrl);

    out.push({
      url: itemUrl,
      title: rawTitle,
      site: "1001zagotovka.ru",
      siteLabel: "1001 Заготовка",
    });
  }

  return out;
}

/* only-paper.ru — uCoz каталог бумажных моделей.
   URL поиска: https://only-paper.ru/search/?q=...&t=0
   Результаты выводятся в блоках <div class="eTitle"><a href="...">...</a></div> */
async function searchOnlyPaper(query: string): Promise<Suggestion[]> {
  const url = `https://only-paper.ru/search/?q=${encodeURIComponent(query)}&t=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://only-paper.ru/",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error("only-paper failed");
  const html = await res.text();

  const out: Suggestion[] = [];
  const seen = new Set<string>();

  const regex = /<div class="eTitle"[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null && out.length < RESULTS_PER_SITE) {
    const itemUrl = match[1];
    const rawTitle = decodeEntities(match[2].replace(/<[^>]+>/g, " ")).trim();
    if (!itemUrl || rawTitle.length < 3 || seen.has(itemUrl)) continue;
    seen.add(itemUrl);

    const fullUrl = itemUrl.startsWith("http") ? itemUrl : `https://only-paper.ru${itemUrl}`;
    out.push({
      url: fullUrl,
      title: rawTitle,
      site: "only-paper.ru",
      siteLabel: "Only-Paper",
    });
  }

  return out;
}
