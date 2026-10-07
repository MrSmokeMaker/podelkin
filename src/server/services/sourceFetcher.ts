// Скачивание страницы-источника для генерации поделки.
// Пользователь даёт ссылку (only-paper.ru, 1001zagotovka.ru и т.п.) —
// отсюда берём чистый текст, который пойдёт в Mistral (long).

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML = 2_000_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; RukodelieBot/1.0; +https://rukodelie.app/about)";

export async function fetchSourceText(url: URL, maxText: number): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Источник вернул ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error("Источник вернул не HTML-страницу");
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML) {
    throw new Error("Страница-источник слишком большая");
  }

  const html = new TextDecoder("utf-8").decode(buffer);
  const text = htmlToText(html);
  if (text.trim().length < 200) {
    throw new Error("На странице не хватает текста для анализа");
  }
  return text.slice(0, maxText);
}

/**
 * Грубая, но честная чистка HTML: убираем скрипты/стили/навигацию,
 * декодируем сущности, схлопываем пустоту. Текст идёт в LLM,
 * которому мусор не мешает, но объём экономит контекст.
 */
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "— ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    laquo: "«",
    raquo: "»",
    mdash: "—",
    ndash: "–",
    hellip: "…",
    middot: "·",
    times: "×",
    rsquo: "’",
    lsquo: "‘",
    ldquo: "“",
    rdquo: "”",
  };
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      safeFromCodePoint(Number(code))
    )
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      safeFromCodePoint(parseInt(hex, 16))
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0x20 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
    return "";
  }
  return String.fromCodePoint(code);
}
