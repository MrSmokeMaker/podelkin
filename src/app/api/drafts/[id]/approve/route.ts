import { NextRequest, NextResponse } from "next/server";
import {
  aiStats,
  attachImageToCraft,
  createAiCraft,
  findAiDraft,
  imageAssetStore,
  markAiDraftApproved,
} from "@/lib/db";
import type { CraftDraftData } from "@/server/services/craftDraft";
import { getOrCreateAsset } from "@/server/services/imageCache";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const draft = findAiDraft(id);

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
  const craft = createAiCraft({
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
    attachImageToCraft(craft.id, {
      imageSeed: asset.seed,
      assetId: asset.id,
      imageUrl: asset.fileUrl ?? "",
    });
    if (fromCache) {
      aiStats.cacheHits += 1;
    } else {
      aiStats.cacheMisses += 1;
      aiStats.imageRenders += 1;
    }
    markAiDraftApproved(draft.id, craft.id);
    return NextResponse.json(
      {
        craftId: craft.id,
        imageUrl: asset.fileUrl,
        fromCache,
      },
      { status: 201 }
    );
  } catch {
    aiStats.cacheMisses += 1;
    markAiDraftApproved(draft.id, craft.id);
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
