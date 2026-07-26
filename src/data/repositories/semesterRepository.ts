/**
 * Minimal semester-lifecycle repository — enough to prove the persistence
 * foundation end-to-end (Semester Setup really writes to Dexie) without
 * building the full Stage 3+ domain-feature repositories.
 */
import { semesterDb, clearSemesterWorkspace } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { Semester } from "@/types/entities";

/** There is at most one Semester row — DATA_MODEL.md: "the app operates on
 * one active semester at a time." */
export async function getActiveSemester(): Promise<Semester | undefined> {
  return withStorageErrorHandling(async () => {
    const all = await semesterDb.semester.toArray();
    return all[0];
  });
}

export interface CreateSemesterInput {
  academicYear: string;
  label: string;
  startDate?: string;
  endDate?: string;
}

export async function createSemester(input: CreateSemesterInput): Promise<Semester> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const semester: Semester = {
      id: createId(),
      academicYear: input.academicYear,
      label: input.label,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.semester.put(semester);
    return semester;
  });
}

/** "Start New Semester" (PRODUCT_SPEC.md §19) — deletes/recreates the
 * entire semester workspace; `preferencesDb` (AppPreferences, global Tags)
 * is never touched. This is a distinct code path from Export, with no
 * chaining between them (Cross-Cutting Invariant #4). */
export async function startNewSemester(): Promise<void> {
  return withStorageErrorHandling(async () => {
    await clearSemesterWorkspace();
  });
}
