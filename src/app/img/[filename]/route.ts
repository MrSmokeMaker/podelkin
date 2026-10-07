import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const FILENAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Только имя файла внутри uploads/crafts — без путей и обхода каталогов.
  if (!FILENAME_PATTERN.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Некорректное имя файла" }, { status: 400 });
  }

  try {
    const data = await readFile(
      path.join(process.cwd(), "uploads", "crafts", filename)
    );
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Ассеты неизменяемы: строка ImageAsset владеет файлом навсегда.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
}
