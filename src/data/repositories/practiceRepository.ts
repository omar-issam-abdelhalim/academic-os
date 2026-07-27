import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { PracticeEntry } from "@/types/entities";

export async function listPracticeForCourse(courseId: string): Promise<PracticeEntry[]> {
  return withStorageErrorHandling(() =>
    semesterDb.practiceEntries.where("courseId").equals(courseId).toArray(),
  );
}

export async function listPracticeForUnit(unitId: string): Promise<PracticeEntry[]> {
  return withStorageErrorHandling(() =>
    semesterDb.practiceEntries.where("unitId").equals(unitId).toArray(),
  );
}

export interface CreatePracticeEntryInput {
  courseId: string;
  unitId?: string;
  label: string;
  scoreEarned: number;
  scoreMax: number;
  recordedAt?: string;
}

/** PracticeEntry is structurally distinct from GradeEntry — never merged,
 * never summed together (PRODUCT_SPEC.md §12). */
export async function createPracticeEntry(input: CreatePracticeEntryInput): Promise<PracticeEntry> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const entry: PracticeEntry = {
      id: createId(),
      courseId: input.courseId,
      unitId: input.unitId,
      label: input.label,
      scoreEarned: input.scoreEarned,
      scoreMax: input.scoreMax,
      recordedAt: input.recordedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.practiceEntries.put(entry);
    return entry;
  });
}

export async function deletePracticeEntry(id: string): Promise<void> {
  return withStorageErrorHandling(() => semesterDb.practiceEntries.delete(id));
}
