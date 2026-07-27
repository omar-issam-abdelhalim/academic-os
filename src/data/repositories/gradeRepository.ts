import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { GradeBoundary, GradeCategory, GradeEntry } from "@/types/entities";

export async function listCategoriesForCourse(courseId: string): Promise<GradeCategory[]> {
  return withStorageErrorHandling(() =>
    semesterDb.gradeCategories.where("courseId").equals(courseId).toArray(),
  );
}

export interface CreateCategoryInput {
  courseId: string;
  name: string;
  maxPoints: number;
  parentCategoryId?: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<GradeCategory> {
  return withStorageErrorHandling(async () => {
    const category: GradeCategory = { id: createId(), ...input };
    await semesterDb.gradeCategories.put(category);
    return category;
  });
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<GradeCategory, "name" | "maxPoints" | "parentCategoryId">>,
): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.gradeCategories.update(id, patch);
  });
}

/** Deleting a category un-assigns (never deletes) any entries that
 * referenced it — an entry losing its category becomes an "unassigned
 * entry," never silently disappears (DATA_MODEL.md's GradeEntry
 * "uncategorized" semantics, extended to the deletion case for the same
 * reason: certainty about what's recorded is never sacrificed). */
export async function deleteCategory(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction(
      "rw",
      semesterDb.gradeCategories,
      semesterDb.gradeEntries,
      async () => {
        const children = await semesterDb.gradeCategories
          .where("parentCategoryId")
          .equals(id)
          .toArray();
        await Promise.all(
          children.map((c) =>
            semesterDb.gradeCategories.update(c.id, { parentCategoryId: undefined }),
          ),
        );
        const entries = await semesterDb.gradeEntries.where("categoryId").equals(id).toArray();
        await Promise.all(
          entries.map((e) => semesterDb.gradeEntries.update(e.id, { categoryId: undefined })),
        );
        await semesterDb.gradeCategories.delete(id);
      },
    );
  });
}

export async function listEntriesForCourse(courseId: string): Promise<GradeEntry[]> {
  return withStorageErrorHandling(() =>
    semesterDb.gradeEntries.where("courseId").equals(courseId).toArray(),
  );
}

export interface CreateGradeEntryInput {
  courseId: string;
  categoryId?: string;
  label: string;
  scoreEarned: number;
  scoreMax: number;
  recordedAt?: string;
}

export async function createGradeEntry(input: CreateGradeEntryInput): Promise<GradeEntry> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const entry: GradeEntry = {
      id: createId(),
      courseId: input.courseId,
      categoryId: input.categoryId,
      label: input.label,
      scoreEarned: input.scoreEarned,
      scoreMax: input.scoreMax,
      recordedAt: input.recordedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.gradeEntries.put(entry);
    return entry;
  });
}

export type UpdateGradeEntryInput = Partial<
  Pick<GradeEntry, "label" | "scoreEarned" | "scoreMax" | "categoryId" | "recordedAt">
>;

export async function updateGradeEntry(id: string, patch: UpdateGradeEntryInput): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.gradeEntries.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

export async function deleteGradeEntry(id: string): Promise<void> {
  return withStorageErrorHandling(() => semesterDb.gradeEntries.delete(id));
}

export async function listBoundariesForCourse(courseId: string): Promise<GradeBoundary[]> {
  return withStorageErrorHandling(() =>
    semesterDb.gradeBoundaries.where("courseId").equals(courseId).toArray(),
  );
}

export interface CreateBoundaryInput {
  courseId: string;
  label: string;
  minPercent: number;
}

export async function createBoundary(input: CreateBoundaryInput): Promise<GradeBoundary> {
  return withStorageErrorHandling(async () => {
    const boundary: GradeBoundary = { id: createId(), ...input };
    await semesterDb.gradeBoundaries.put(boundary);
    return boundary;
  });
}

export async function deleteBoundary(id: string): Promise<void> {
  return withStorageErrorHandling(() => semesterDb.gradeBoundaries.delete(id));
}
