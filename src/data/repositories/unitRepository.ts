import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { ContentBlock, Unit, UnitType } from "@/types/entities";

export async function listUnitsForCourse(courseId: string): Promise<Unit[]> {
  return withStorageErrorHandling(async () => {
    const units = await semesterDb.units.where("courseId").equals(courseId).toArray();
    return units.sort((a, b) => a.order - b.order);
  });
}

export async function getUnit(id: string): Promise<Unit | undefined> {
  return withStorageErrorHandling(() => semesterDb.units.get(id));
}

export interface CreateUnitInput {
  courseId: string;
  title: string;
  type: UnitType;
}

export async function createUnit(input: CreateUnitInput): Promise<Unit> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const existing = await semesterDb.units.where("courseId").equals(input.courseId).toArray();
    const order = existing.length === 0 ? 0 : Math.max(...existing.map((u) => u.order)) + 1;
    const unit: Unit = {
      id: createId(),
      courseId: input.courseId,
      title: input.title,
      type: input.type,
      order,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.units.put(unit);
    return unit;
  });
}

export type UpdateUnitInput = Partial<Pick<Unit, "title" | "type">>;

export async function updateUnit(id: string, patch: UpdateUnitInput): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.units.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

export async function reorderUnits(orderedIds: string[]): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction("rw", semesterDb.units, async () => {
      await Promise.all(
        orderedIds.map((id, index) => semesterDb.units.update(id, { order: index })),
      );
    });
  });
}

function isBlobBackedBlock(
  block: ContentBlock,
): block is Extract<ContentBlock, { blobId: string }> {
  return block.type !== "text";
}

/**
 * Cascades per DATA_MODEL.md: deleting a Unit deletes its ContentBlocks
 * (+Blobs), unit-scoped Tasks (+TaskCompletionEvents), and unit-scoped
 * PracticeEntries; course-level Tasks/PracticeEntries not tied to this
 * unit are unaffected.
 */
export async function deleteUnit(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction(
      "rw",
      [
        semesterDb.units,
        semesterDb.contentBlocks,
        semesterDb.blobs,
        semesterDb.tasks,
        semesterDb.taskCompletionEvents,
        semesterDb.practiceEntries,
      ],
      async () => {
        const blocks = await semesterDb.contentBlocks.where("unitId").equals(id).toArray();
        const blobIds = blocks.filter(isBlobBackedBlock).map((b) => b.blobId);

        const tasks = await semesterDb.tasks.where("unitId").equals(id).toArray();
        const taskIds = tasks.map((t) => t.id);
        const events = taskIds.length
          ? await semesterDb.taskCompletionEvents.where("taskId").anyOf(taskIds).toArray()
          : [];

        const practice = await semesterDb.practiceEntries.where("unitId").equals(id).toArray();

        await Promise.all([
          semesterDb.contentBlocks.bulkDelete(blocks.map((b) => b.id)),
          semesterDb.blobs.bulkDelete(blobIds),
          semesterDb.tasks.bulkDelete(taskIds),
          semesterDb.taskCompletionEvents.bulkDelete(events.map((e) => e.id)),
          semesterDb.practiceEntries.bulkDelete(practice.map((p) => p.id)),
          semesterDb.units.delete(id),
        ]);
      },
    );
  });
}
