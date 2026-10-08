import { NextRequest, NextResponse } from "next/server";
import { decodeEntities } from "@/server/services/sourceFetcher";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML = 1_000_000;
const RESULTS_PER_SITE = 8;

const USER_AGENT =
  "Mozilla/5.0 (compatible; RukodelieBot/1.0; +https://rukodelie.app/about)";

interface SiteConfig {
  host: string;
  label: string;
  searchUrls: (query: string) => string[];
  isArticlePath: (path: string) => boolean;
}

interface Suggestion {
  url: string;
  title: string;
  site: string;
  siteLabel: string;
}

// Адреса перечислены в порядке попыток: https, затем http, затем альтернативный
// движок поиска. Первый успешный HTML-ответ используется для разбора ссылок.
const SITES: SiteConfig[] = [
  {
    host: "1001zagotovka.ru",
    label: "1001 заготовка",
    searchUrls: (query) => [`https://1001zagotovka.ru/?s=${encodeURIComponent(query)}`],
    isArticlePath: (path) =>
      path !== "/" && !/^\/(category|tag|author|page|wp-|feed|comments)/i.test(path),
  },
  {
    host: "only-paper.ru",
    label: "Only-Paper",
    searchUrls: (query) => {
      const q = encodeURIComponent(query);
      return [
        `https://only-paper.ru/search/?q=${q}`,
        `http://only-paper.ru/search/?q=${q}`,
        `https://only-paper.ru/index.php?do=search&subaction=search&story=${q}&q=${q}`,
      ];
    },
    isArticlePath: (path) => /\/(news|publ|blog|load)\//i.test(path),
  },
];

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

  const settled = await Promise.allSettled(
    SITES.map((site) => searchSite(site, query))
  );

  const results: Suggestion[] = [];
  const failed: string[] = [];
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") {
      results.push(...outcome.value);
    } else {
      failed.push(SITES[index].host);
    }
  });

  return NextResponse.json(
    { results, failed },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function searchSite(site: SiteConfig, query: string): Promise<Suggestion[]> {
  const html = await fetchFirstHtml(site.searchUrls(query));
  if (html === null) {
    throw new Error(`${site.host}: страница поиска недоступна`);
  }
  return extractArticles(html, site);
}

async function fetchFirstHtml(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        redirect: "follow",
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;

      // Часть старых сайтов отдаёт windows-1251 — декодируем честно.
      const charset = /charset=([\w-]+)/i.exec(contentType)?.[1] ?? "utf-8";
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_HTML * 2) continue;
      try {
        return new TextDecoder(charset).decode(buffer);
      } catch {
        return new TextDecoder("utf-8").decode(buffer);
      }
    } catch {
      // таймаут/сеть — пробуем следующий адрес
    }
  }
  return null;
}

function extractArticles(html: string, site: SiteConfig): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();

  // Сначала заголовки записей — там точные названия мастер-классов.
  collect(
    out,
    seen,
    html,
    site,
    /<h[1-4][^>]*>\s*<a\b[^>]*href\s*=\s*["']([^"'\s#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  );
  // Если шаблон не дал результатов — общий проход по ссылкам с фильтром путей.
  if (out.length < 3) {
    collect(
      out,
      seen,
      html,
      site,
      /<a\b[^>]*href\s*=\s*["']([^"'\s#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
    );
  }
  return out;
}

function collect(
  out: Suggestion[],
  seen: Set<string>,
  html: string,
  site: SiteConfig,
  linkRe: RegExp
): void {
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null && out.length < RESULTS_PER_SITE) {
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    // Служебные ссылки («О сайте», пункты меню) короткие или из одного слова.
    if (title.length < 10 || !title.includes(" ")) continue;

    let resolved: URL;
    try {
      resolved = new URL(match[1], `https://${site.host}/`);
    } catch {
      continue;
    }
    if (resolved.hostname.replace(/^www\./, "") !== site.host) continue;

    resolved.hash = "";
    if (!site.isArticlePath(resolved.pathname.toLowerCase())) continue;
    if (seen.has(resolved.href)) continue;
    seen.add(resolved.href);

    out.push({
      url: resolved.href,
      title,
      site: site.host,
      siteLabel: site.label,
    });
  }
}
