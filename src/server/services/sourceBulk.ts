import { decodeEntities, fetchSourceHtml } from "./sourceFetcher";
import { importCraftFromSource } from "./sourceImport";
import {
  findCatalogItemBySourceUrl,
  createCatalogItem,
} from "@/lib/catalog-db-server";
import {
  type CatalogDifficulty,
} from "@/lib/catalog-db";

/* Автозагрузка каталога из источников. Один раз за жизнь процесса
   (при первом запросе каталога) в фоне набирает поделки со страниц
   only-paper.ru и 1001zagotovka.ru через тот же конвейер, что и
   ручной импорт: фото сохраняется в uploads/crafts, инструкция и
   материалы — в записи каталога. Дубликаты отсекаются по sourceUrl. */

const BULK_MAX_ITEMS = 20;
const TIME_BUDGET_MS = 210_000;
const DELAY_BETWEEN_MS = 2_000;
const CANDIDATE_CAP = 40;
const LINKS_PER_PAGE = 12;

const SEARCH_QUERIES = ["поделка", "открытка", "модель"];

let bulkRunning = false;
let bulkRanOnce = false;

export function isBulkImporting(): boolean {
  return bulkRunning;
}

/** Вызывается из GET /api/catalog: стартует фон и мгновенно возвращает управление. */
export function startBulkImportIfNeeded(): void {
  if (bulkRanOnce || bulkRunning) return;
  bulkRanOnce = true;
  bulkRunning = true;
  runBulkImport()
    .catch(() => {})
    .finally(() => {
      bulkRunning = false;
    });
}

async function runBulkImport(): Promise<void> {
  const candidates = await discoverCandidates();
  if (candidates.length === 0) return;

  const deadline = Date.now() + TIME_BUDGET_MS;
  let imported = 0;

  for (const url of candidates) {
    if (imported >= BULK_MAX_ITEMS || Date.now() > deadline) break;
    // Ручной импорт мог уже добавить эту страницу — не плодим дубликаты.
    if (await findCatalogItemBySourceUrl(url)) continue;

    try {
      const data = await importCraftFromSource(new URL(url));
      const difficulty: CatalogDifficulty =
        data.instructions.length >= 8
          ? "сложно"
          : data.instructions.length > 0 && data.instructions.length <= 4
            ? "легко"
            : "средне";
      await createCatalogItem({
        title: data.title,
        category: data.category,
        sourceUrl: url,
        description: data.description,
        difficulty,
        materials: data.materials,
        instructions: data.instructions,
        assemblyTime: data.assemblyTime,
        thumbnail: data.imageUrl,
        templateUrl: null,
        tags: [],
      });
      imported += 1;
    } catch {
      continue; // страница не ответила или не разобралась — берём следующую
    }
    await sleep(DELAY_BETWEEN_MS);
  }

  console.log(`[bulk-import] импортировано поделок: ${imported}`);
}

/* Где искать статьи: главные страницы (свежие записи) + поиск по
   широким запросам. Все страницы запрашиваются параллельно, неудачные
   просто выпадают из выборки. */
async function discoverCandidates(): Promise<string[]> {
  const targets: { host: string; url: string }[] = [
    { host: "1001zagotovka.ru", url: "https://1001zagotovka.ru/" },
    {
      host: "only-paper.ru",
      url: "https://only-paper.ru/index.php?do=search&subaction=search&story=%D0%BF%D0%BE%D0%B4%D0%B5%D0%BB%D0%BA%D0%B0",
    },
  ];
  for (const query of SEARCH_QUERIES) {
    const q = encodeURIComponent(query);
    targets.push({ host: "1001zagotovka.ru", url: `https://1001zagotovka.ru/?s=${q}` });
    targets.push({
      host: "only-paper.ru",
      url: `https://only-paper.ru/index.php?do=search&subaction=search&story=${q}`,
    });
  }

  const settled = await Promise.allSettled(
    targets.map(async (target) => {
      const { html } = await fetchSourceHtml(new URL(target.url));
      return extractLinks(html, target.host);
    })
  );

  const seen = new Set<string>();
  const out: string[] = [];
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    for (const url of outcome.value) {
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
      if (out.length >= CANDIDATE_CAP) return out;
    }
  }
  return out;
}

function extractLinks(html: string, host: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const linkRe = /<a\b[^>]*href\s*=\s*["']([^"'\s#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null && out.length < LINKS_PER_PAGE) {
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    // Служебные ссылки («О сайте», пункты меню) короткие или из одного слова.
    if (title.length < 10 || !title.includes(" ")) continue;

    let resolved: URL;
    try {
      resolved = new URL(match[1], `https://${host}/`);
    } catch {
      continue;
    }
    if (resolved.hostname.replace(/^www\./, "") !== host) continue;
    resolved.hash = "";
    if (!isArticlePath(host, resolved.pathname.toLowerCase())) continue;
    if (seen.has(resolved.href)) continue;
    seen.add(resolved.href);
    out.push(resolved.href);
  }
  return out;
}

function isArticlePath(host: string, path: string): boolean {
  if (host === "1001zagotovka.ru") {
    return path !== "/" && !/^\/(category|tag|author|page|wp-|feed|comments)/i.test(path);
  }
  return /\/(news|publ|blog|load)\//i.test(path);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
