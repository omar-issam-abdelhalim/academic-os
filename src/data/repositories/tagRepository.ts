/**
 * Tags are global/persistent (DATA_MODEL.md §Tag) — this repository reads
 * and writes `preferencesDb`, not the semester database, and therefore
 * survives "Start New Semester" untouched.
 */
import { preferencesDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { Tag, TagColor } from "@/types/entities";

export async function listTags(): Promise<Tag[]> {
  return withStorageErrorHandling(async () => {
    const tags = await preferencesDb.tags.toArray();
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function createTag(name: string, color: TagColor): Promise<Tag> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const tag: Tag = { id: createId(), name, color, createdAt: now, updatedAt: now };
    await preferencesDb.tags.put(tag);
    return tag;
  });
}

export async function updateTag(
  id: string,
  patch: Partial<Pick<Tag, "name" | "color">>,
): Promise<void> {
  return withStorageErrorHandling(async () => {
    await preferencesDb.tags.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

/** Deletes the global Tag definition only. Any `Course.tagIds` entries
 * that referenced it become stale and are filtered at read time by
 * course-side code — no cross-database cascade (DATA_MODEL.md). */
export async function deleteTag(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await preferencesDb.tags.delete(id);
  });
}
