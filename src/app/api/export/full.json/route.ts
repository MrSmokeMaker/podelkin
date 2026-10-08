import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { boards, crafts, inventory, projects } from "@/lib/db";

export const dynamic = "force-dynamic";

/* Полный бэкап мастерской — только тариф «Директор» (exportJson). */
export async function GET(request: Request) {
  const user = getAuthUser(request);
  if (!user.features.allowed.includes("exportJson")) {
    return NextResponse.json(
      { error: "Полный бэкап доступен на тарифе «Директор»." },
      { status: 403 }
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    tariff: user.role,
    crafts,
    inventory,
    projects,
    boards,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="podelkin-backup.json"',
    },
  });
}
