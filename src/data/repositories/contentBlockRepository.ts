import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import { validateUpload, type UploadBlockType } from "@/domain/contentValidation";
import type { ContentBlock, StoredBlob } from "@/types/entities";

export async function listBlocksForUnit(unitId: string): Promise<ContentBlock[]> {
  return withStorageErrorHandling(async () => {
    const blocks = await semesterDb.contentBlocks.where("unitId").equals(unitId).toArray();
    return blocks.sort((a, b) => a.order - b.order);
  });
}

async function nextOrder(unitId: string): Promise<number> {
  const existing = await semesterDb.contentBlocks.where("unitId").equals(unitId).toArray();
  return existing.length === 0 ? 0 : Math.max(...existing.map((b) => b.order)) + 1;
}

export async function createTextBlock(
  unitId: string,
  title: string,
  content: string,
): Promise<ContentBlock> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const block: ContentBlock = {
      id: createId(),
      unitId,
      title,
      order: await nextOrder(unitId),
      createdAt: now,
      updatedAt: now,
      type: "text",
      content,
    };
    await semesterDb.contentBlocks.put(block);
    return block;
  });
}

export async function updateTextBlock(
  id: string,
  patch: Partial<{ title: string; content: string }>,
): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.contentBlocks.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

export class UploadValidationError extends Error {}

/**
 * Validates and stores an uploaded File as a Blob row, then creates the
 * referencing file/image/video ContentBlock in the same transaction so the
 * two are never left out of sync (DATA_MODEL.md §Blob / §ContentBlock).
 */
export async function createUploadBlock(
  unitId: string,
  blockType: UploadBlockType,
  title: string,
  file: File,
): Promise<ContentBlock> {
  const validation = validateUpload(blockType, file);
  if (!validation.ok) {
    throw new UploadValidationError(validation.error ?? "That file couldn't be used.");
  }
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const blobId = createId();
    const storedBlob: StoredBlob = {
      id: blobId,
      mimeType: file.type,
      sizeBytes: file.size,
      data: file,
      createdAt: now,
    };
    const block: ContentBlock = {
      id: createId(),
      unitId,
      title,
      order: await nextOrder(unitId),
      createdAt: now,
      updatedAt: now,
      type: blockType,
      blobId,
      originalFileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    };
    await semesterDb.transaction("rw", semesterDb.blobs, semesterDb.contentBlocks, async () => {
      await semesterDb.blobs.put(storedBlob);
      await semesterDb.contentBlocks.put(block);
    });
    return block;
  });
}

export async function updateBlockTitle(id: string, title: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.contentBlocks.update(id, { title, updatedAt: new Date().toISOString() });
  });
}

export async function reorderBlocks(orderedIds: string[]): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction("rw", semesterDb.contentBlocks, async () => {
      await Promise.all(
        orderedIds.map((id, index) => semesterDb.contentBlocks.update(id, { order: index })),
      );
    });
  });
}

export async function getBlob(blobId: string): Promise<StoredBlob | undefined> {
  return withStorageErrorHandling(() => semesterDb.blobs.get(blobId));
}

export async function deleteBlock(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction("rw", semesterDb.contentBlocks, semesterDb.blobs, async () => {
      const block = await semesterDb.contentBlocks.get(id);
      if (!block) return;
      if (block.type !== "text") {
        await semesterDb.blobs.delete(block.blobId);
      }
      await semesterDb.contentBlocks.delete(id);
    });
  });
}
