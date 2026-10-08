import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CatalogCategory } from "@/lib/catalog-db";
import { decodeEntities, fetchSourceHtml } from "./sourceFetcher";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_STEPS = 14;
const MAX_MATERIALS = 15;

const USER_AGENT =
  "Mozilla/5.0 (compatible; RukodelieBot/1.0; +https://rukodelie.app/about)";

export interface ImportedSource {
  title: string;
  description: string;
  category: CatalogCategory;
  assemblyTime: string;
  materials: string[];
  instructions: string[];
  imageUrl: string | null;
}

/* Разбор страницы мастер-класса без ИИ: заголовок, итоговое фото,
   шаги инструкции и список материалов. Эвристики заточены под
   WordPress-статьи (1001zagotovka) и DLE (only-paper). */
export async function importCraftFromSource(url: URL): Promise<ImportedSource> {
  const { html, finalUrl } = await fetchSourceHtml(url);
  const base = new URL(finalUrl || url.href);

  const body = visibleBody(html);
  const text = plainText(body);

  const title = extractTitle(html) ?? firstSentence(text) ?? "Поделка из источника";
  const description = extractDescription(text);
  const instructions = extractInstructions(body);
  const materials = extractMaterials(body, text);
  const assemblyTime = extractAssemblyTime(text);
  const category = guessCategory(`${title} ${description} ${text.slice(0, 2000)}`);

  const photoUrl = extractPhotoUrl(html, base);
  const imageUrl = photoUrl ? await downloadImage(photoUrl).catch(() => null) : null;

  return { title, description, category, assemblyTime, materials, instructions, imageUrl };
}

function visibleBody(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|head|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|footer|header|aside|form)[\s\S]*?<\/\1>/gi, " ");
}

function stripTags(fragment: string): string {
  return decodeEntities(fragment.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function plainText(body: string): string {
  return body
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n— ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractTitle(html: string): string | null {
  const meta =
    /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i.exec(html) ??
    /<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i.exec(html);
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const raw = meta?.[1] ?? (h1 ? stripTags(h1[1]) : null) ?? (titleTag ? stripTags(titleTag[1]) : null);
  if (!raw) return null;

  let title = stripTags(raw);
  // «Название | 1001 Заготовка» → оставляем только название.
  const parts = title.split(/\s+[|–—]\s+/);
  if (parts.length > 1 && /(1001|zagotovka|only[- ]paper|заготовк|поделк|рукодел)/i.test(parts[parts.length - 1])) {
    title = parts.slice(0, -1).join(" — ");
  }
  title = title.trim();
  return title.length > 0 ? title.slice(0, 160) : null;
}

function firstSentence(text: string): string | null {
  const line = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length >= 10 && line.length <= 160);
  return line ?? null;
}

function extractDescription(text: string): string {
  const line = text
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line.length >= 60 &&
        line.length <= 400 &&
        !/^(—|©|читайте|подписывайт|смотрит)/i.test(line)
    );
  return line ? line.slice(0, 400) : "";
}

function extractInstructions(body: string): string[] {
  // Самый длинный нумерованный список в статье обычно и есть ход работы.
  let best: string[] = [];
  const listRe = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  let listMatch: RegExpExecArray | null;
  while ((listMatch = listRe.exec(body)) !== null) {
    const items = listItems(listMatch[1]).filter((item) => item.length >= 15);
    if (items.length > best.length) best = items;
  }
  if (best.length >= 3) {
    return best.slice(0, MAX_STEPS).map((item) => item.slice(0, 400));
  }

  // Запасной путь: содержательные абзацы описания.
  const steps: string[] = [];
  const paragraphRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let paragraphMatch: RegExpExecArray | null;
  while ((paragraphMatch = paragraphRe.exec(body)) !== null && steps.length < MAX_STEPS) {
    const paragraph = stripTags(paragraphMatch[1]);
    if (
      paragraph.length >= 40 &&
      paragraph.length <= 500 &&
      !/подписывайт|комментар|читайте также|похож|реклам|copyright|©/i.test(paragraph)
    ) {
      steps.push(paragraph.slice(0, 400));
    }
  }
  return steps.length >= 3 ? steps : [];
}

function listItems(fragment: string): string[] {
  const out: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRe.exec(fragment)) !== null) {
    const item = stripTags(match[1]);
    if (item) out.push(item);
  }
  return out;
}

const MATERIAL_WORDS =
  /клей|бумаг|картон|краск|кист|ножниц|канцелярск|нит(ь|и|к)|пряж|джут|лент|тесьм|бисер|бусин|проволок|фетр|ткан|фоамиран|пластилин|глина|воск|фитил|акрил|лак|губк|поролон|синтепон|наполнител|шил|линейк|карандаш|маркер|скотч|степлер|пенопласт|шишк|пайетк|страз|мулин|игл|спиц|крючок|шерст|мешковин|фанер|эпоксид|силикон/i;
const STEP_WORDS =
  /нанесит|наносим|выреж|приклей|отреж|смешай|покрой|возьмит|надень|обмотай|вставь|привяж|намаж|прижми|повтори|дождат|вырезаем|склеива|оборачива|декорируем|сушим|ждем|ждём|затем/i;

function extractMaterials(body: string, text: string): string[] {
  // Явный блок «Вам понадобится / Материалы» со списком после заголовка.
  const blockRe =
    /(?:понадобитс[ьяё]*|материал|что\s+нужно|инструмент)[^<]{0,60}<\/(?:h[1-6]|p|strong|b|div)>\s*(?:<[^>]+>\s*)*<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i;
  const block = blockRe.exec(body);
  if (block) {
    const items = listItems(block[2])
      .map((item) => item.replace(/[;:.]\s*$/, "").trim())
      .filter((item) => item.length >= 3 && item.length <= 80 && !STEP_WORDS.test(item));
    if (items.length >= 2) return dedupe(items).slice(0, MAX_MATERIALS);
  }

  // Запасной путь: короткие перечисления в тексте.
  const candidates = text
    .split(/\n|;|,|•|·/)
    .map((part) => part.replace(/^[—–\-\s•·]+/, "").trim())
    .filter(
      (part) =>
        part.length >= 3 &&
        part.length <= 60 &&
        MATERIAL_WORDS.test(part) &&
        !STEP_WORDS.test(part) &&
        !/^\d+\s*(шаг|этап)/i.test(part)
    );
  return dedupe(candidates).slice(0, MAX_MATERIALS);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function extractAssemblyTime(text: string): string {
  const match = /(\d{1,3})\s*(минут[а-яё]*|мин(?:\b|\.|(?=\s))|час[а-яё]*|дн[а-яё]*)/i.exec(text);
  if (!match) return "";
  const amount = Number(match[1]);
  if (amount === 0 || amount > 720) return "";
  const unit = match[2].toLowerCase();
  if (unit.startsWith("мин")) return `${amount} мин`;
  if (unit.startsWith("час")) {
    const form = amount === 1 ? "час" : amount < 5 ? "часа" : "часов";
    return `${amount} ${form}`;
  }
  const form = amount === 1 ? "день" : amount < 5 ? "дня" : "дней";
  return `${amount} ${form}`;
}

function guessCategory(text: string): CatalogCategory {
  const lower = text.toLowerCase();
  if (/открытк/.test(lower)) return "3D-открытка";
  if (/(бумажн|модел|развёртк|развертк|масштаб)/.test(lower)) return "бумажная модель";
  if (/(деревянн|фанер|заготовк|выпил|выжига)/.test(lower)) return "деревянная заготовка";
  if (/(игрушк|амигуруми|кукол|мягк)/.test(lower)) return "игрушка";
  if (/(макет|мельниц|машинк|корабл|домик)/.test(lower)) return "макет";
  return "декор";
}

function extractPhotoUrl(html: string, base: URL): URL | null {
  const og =
    /<meta[^>]+property=["']og:image[^"']*["'][^>]*content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image[^"']*["']/i.exec(html) ??
    /<meta[^>]+name=["']twitter:image[^"']*["'][^>]*content=["']([^"']+)["']/i.exec(html);
  if (og) return absoluteUrl(og[1], base);

  const imgRe = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html)) !== null) {
    const tag = match[0];
    const src = /(?:\bdata-src\b|\bsrc)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src || /^(data|blob):/i.test(src)) continue;
    const width = Number(/\bwidth\s*=\s*["']?(\d+)/i.exec(tag)?.[1] ?? 0);
    if (width > 0 && width < 250) continue;
    if (/smil|icon|emoji|logo|avatar|banner|button/i.test(src)) continue;
    if (!/\.(jpe?g|png|webp)(?:$|[?#])/i.test(src)) continue;
    const resolved = absoluteUrl(src, base);
    if (resolved) return resolved;
  }
  return null;
}

function absoluteUrl(value: string, base: URL): URL | null {
  try {
    const resolved = new URL(value, base);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved;
  } catch {
    return null;
  }
}

const IMAGE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function downloadImage(url: URL): Promise<string | null> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!response.ok) return null;
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_EXT[type];
  if (!ext) return null;
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;

  const filename = `pod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "uploads", "crafts");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(buffer));
  return `/img/${filename}`;
}
