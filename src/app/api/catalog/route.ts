import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
  return NextResponse.json({ total: catalogItems.length, items: catalogItems });
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

export async function POST(request: Request) {
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
    assemblyTime,
    thumbnail,
    templateUrl: templateUrl || null,
    tags: splitList(form.get("tags")),
  });

  return NextResponse.json({ item }, { status: 201 });
}
