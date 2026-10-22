import { NextRequest, NextResponse } from "next/server";
import {
  attachImageToCraft,
  bumpAiStat,
  createAiCraft,
  findAiDraft,
  imageAssetStore,
  markAiDraftApproved,
} from "@/lib/db-server";
import type { CraftDraftData } from "@/server/services/craftDraft";
import { getOrCreateAsset } from "@/server/services/imageCache";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = await findAiDraft(id);

  if (!draft || !draft.valid) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 });
  }
  if (draft.status !== "draft") {
    return NextResponse.json(
      { error: "Черновик уже обработан" },
      { status: 409 }
    );
  }

  const payload = draft.payload as CraftDraftData;

  // Поделка создаётся сразу: сбой картинки не должен терять одобренный текст.
  const craft = await createAiCraft({
    title: payload.title,
    summary: payload.summary,
    category: payload.category,
    difficulty: payload.difficulty,
    estimatedTimeMin: payload.estimatedTimeMin,
    steps: payload.steps,
    materials: payload.materials,
    tools: payload.tools,
    tags: payload.tags,
    safetyNotes: payload.safetyNotes,
    imagePrompt: payload.imagePrompt,
  });

  try {
    const { asset, fromCache } = await getOrCreateAsset(
      payload.imagePrompt,
      imageAssetStore
    );
    // seed берётся из ассета: при попадании в кэш переиспользуется, не пересеивается.
    await attachImageToCraft(craft.id, {
      imageSeed: asset.seed,
      assetId: asset.id,
      imageUrl: asset.fileUrl ?? "",
    });
    if (fromCache) {
      await bumpAiStat("cacheHits");
    } else {
      await bumpAiStat("cacheMisses");
      await bumpAiStat("imageRenders");
    }
    await markAiDraftApproved(draft.id, craft.id);
    return NextResponse.json(
      {
        craftId: craft.id,
        imageUrl: asset.fileUrl,
        fromCache,
      },
      { status: 201 }
    );
  } catch {
    await bumpAiStat("cacheMisses");
    await markAiDraftApproved(draft.id, craft.id);
    return NextResponse.json(
      {
        craftId: craft.id,
        imageUrl: null,
        fromCache: false,
        imageFailed: true,
      },
      { status: 201 }
    );
  }
}
