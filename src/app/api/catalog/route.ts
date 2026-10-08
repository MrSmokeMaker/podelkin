import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseSourceUrl } from "@/server/services/sourceFetcher";
import { importCraftFromSource } from "@/server/services/sourceImport";
import {
  isBulkImporting,
  startBulkImportIfNeeded,
} from "@/server/services/sourceBulk";
import {
  catalogItems,
  createCatalogItem,
  CATALOG_CATEGORIES,
  CATALOG_DIFFICULTIES,
  type CatalogCategory,
  type CatalogDifficulty,
} from "@/lib/catalog-db";

export const dynamic = "force-dynamic";

/* По спеке источники только эти два — ссылка обязана вести на один из них. */
const ALLOWED_SOURCE_DOMAINS = ["only-paper.ru", "1001zagotovka.ru"];

const THUMB_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_THUMB_BYTES = 5 * 1024 * 1024;

export function GET() {
  // Первый запрос каталога запускает фоновую автозагрузку из источников;
  // importing говорит клиенту, что список стоит обновить чуть позже.
  startBulkImportIfNeeded();
  return NextResponse.json({
    total: catalogItems.length,
    items: catalogItems,
    importing: isBulkImporting(),
  });
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

function splitList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 20);
}

/* Шаги инструкции приходят по одному на строку — их же читает режим мастера. */
function splitSteps(value: FormDataEntryValue | null): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const steps = value
    .split("\n")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .slice(0, 14);
  return steps.length > 0 ? steps : undefined;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  /* JSON { url } — импорт поделки со страницы-источника (кнопка «Из источника»);
     multipart/form-data — ручное добавление из формы «Новая поделка». */
  if (contentType.includes("application/json")) {
    return importFromSourcePage(request);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 }
    );
  }

  const title = String(form.get("title") ?? "").trim();
  const category = String(form.get("category") ?? "").trim();
  const difficulty = String(form.get("difficulty") ?? "").trim();
  const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const assemblyTime = String(form.get("assemblyTime") ?? "").trim();
  const templateUrl = String(form.get("templateUrl") ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Поле title обязательно" }, { status: 400 });
  }
  if (!(CATALOG_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: `Категория должна быть одной из: ${CATALOG_CATEGORIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!(CATALOG_DIFFICULTIES as readonly string[]).includes(difficulty)) {
    return NextResponse.json(
      { error: `Сложность должна быть одной из: ${CATALOG_DIFFICULTIES.join(", ")}` },
      { status: 400 }
    );
  }
  if (
    !isHttpUrl(sourceUrl) ||
    !ALLOWED_SOURCE_DOMAINS.some((domain) => sourceUrl.toLowerCase().includes(domain))
  ) {
    return NextResponse.json(
      { error: "Ссылка на источник обязательна и должна вести на only-paper.ru или 1001zagotovka.ru" },
      { status: 400 }
    );
  }
  if (templateUrl && !isHttpUrl(templateUrl)) {
    return NextResponse.json(
      { error: "Ссылка на шаблон должна начинаться с http:// или https://" },
      { status: 400 }
    );
  }

  let thumbnail: string | null = null;
  const thumb = form.get("thumbnail");
  if (thumb instanceof File && thumb.size > 0) {
    const ext = THUMB_EXT[thumb.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Превью: поддерживаются только JPG, PNG и WebP" },
        { status: 400 }
      );
    }
    if (thumb.size > MAX_THUMB_BYTES) {
      return NextResponse.json(
        { error: "Превью не должно превышать 5 МБ" },
        { status: 400 }
      );
    }
    const filename = `pod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const dir = path.join(process.cwd(), "uploads", "crafts");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await thumb.arrayBuffer()));
    thumbnail = `/img/${filename}`;
  }

  const item = createCatalogItem({
    title,
    category: category as CatalogCategory,
    sourceUrl,
    description,
    difficulty: difficulty as CatalogDifficulty,
    materials: splitList(form.get("materials")),
    instructions: splitSteps(form.get("instructions")),
    assemblyTime,
    thumbnail,
    templateUrl: templateUrl || null,
    tags: splitList(form.get("tags")),
  });

  return NextResponse.json({ item }, { status: 201 });
}

/* Импорт: страница мастер-класса разбирается на сервере, поделка сразу
   попадает в каталог — без AI-генерации и без списания квоты. */
async function importFromSourcePage(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const raw = typeof body?.url === "string" ? body.url.trim() : "";

  const parsed = parseSourceUrl(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку, начинающуюся с http:// или https://" },
      { status: 400 }
    );
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (!ALLOWED_SOURCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return NextResponse.json(
      { error: "Поддерживаются ссылки только на only-paper.ru и 1001zagotovka.ru" },
      { status: 400 }
    );
  }

  // Повторный импорт той же страницы не плодит дубликаты в каталоге.
  const existing = catalogItems.find((item) => item.sourceUrl === parsed.href);
  if (existing) {
    return NextResponse.json({ item: existing, existing: true });
  }

  let imported;
  try {
    imported = await importCraftFromSource(parsed);
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      {
        error: timedOut
          ? "Страница-источник не ответила за 15 секунд"
          : "Не удалось разобрать страницу-источник",
      },
      { status: 422 }
    );
  }

  // Косвенная оценка сложности: чем длиннее инструкция, тем она трудоёмче.
  const stepCount = imported.instructions.length;
  const difficulty: CatalogDifficulty =
    stepCount >= 8 ? "сложно" : stepCount > 0 && stepCount <= 4 ? "легко" : "средне";

  const item = createCatalogItem({
    title: imported.title,
    category: imported.category,
    sourceUrl: parsed.href,
    description: imported.description,
    difficulty,
    materials: imported.materials,
    instructions: imported.instructions,
    assemblyTime: imported.assemblyTime,
    thumbnail: imported.imageUrl,
    templateUrl: null,
    tags: [],
  });

  return NextResponse.json({ item }, { status: 201 });
}
