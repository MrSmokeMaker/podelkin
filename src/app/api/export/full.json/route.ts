import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { listBoards, listCrafts, listInventory, listProjects } from "@/lib/db-server";

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

  const [allCrafts, allInventory, allProjects, allBoards] = await Promise.all([
    listCrafts(),
    listInventory(),
    listProjects(),
    listBoards(),
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    tariff: user.role,
    crafts: allCrafts,
    inventory: allInventory,
    projects: allProjects,
    boards: allBoards,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="podelkin-backup.json"',
    },
  });
}
