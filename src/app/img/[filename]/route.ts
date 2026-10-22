import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export const dynamic = "force-dynamic";

const FILENAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!FILENAME_PATTERN.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Некорректное имя файла" }, { status: 400 });
  }

  // 1. Проверяем в /tmp/crafts (Vercel serverless)
  const tmpPath = path.join(os.tmpdir(), "crafts", filename);
  try {
    const data = await readFile(tmpPath);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // 2. Проверяем в uploads/crafts (локально)
    try {
      const localPath = path.join(process.cwd(), "uploads", "crafts", filename);
      const data = await readFile(localPath);
      return new NextResponse(new Uint8Array(data), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }
  }
}
