import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { ContentBlock, Course } from "@/types/entities";

export async function listCourses(): Promise<Course[]> {
  return withStorageErrorHandling(async () => {
    const all = await semesterDb.courses.toArray();
    return all.sort((a, b) => a.order - b.order);
  });
}

export async function getCourse(id: string): Promise<Course | undefined> {
  return withStorageErrorHandling(() => semesterDb.courses.get(id));
}

export interface CreateCourseInput {
  name: string;
  code?: string;
  instructor?: string;
  description?: string;
  tagIds?: string[];
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const existing = await semesterDb.courses.toArray();
    const order = existing.length === 0 ? 0 : Math.max(...existing.map((c) => c.order)) + 1;
    const course: Course = {
      id: createId(),
      name: input.name,
      code: input.code,
      instructor: input.instructor,
      description: input.description,
      tagIds: input.tagIds ?? [],
      order,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.courses.put(course);
    return course;
  });
}

export type UpdateCourseInput = Partial<
  Pick<Course, "name" | "code" | "instructor" | "description" | "tagIds">
>;

export async function updateCourse(id: string, patch: UpdateCourseInput): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.courses.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

/** Persists a full drag-reordered course list — order values are rewritten
 * to match array position (STAGE_1A_UX_ARCHITECTURE.md: course-list
 * ordering is meaningful, not just insertion order). */
export async function reorderCourses(orderedIds: string[]): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction("rw", semesterDb.courses, async () => {
      await Promise.all(
        orderedIds.map((id, index) => semesterDb.courses.update(id, { order: index })),
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
 * Cascades per DATA_MODEL.md §"Referential Integrity & Deletion Rules":
 * deleting a Course deletes its Units, ContentBlocks (+Blobs), Tasks
 * (+TaskCompletionEvents), ScheduleTemplates (+Occurrences),
 * GradeCategories/Entries/Boundaries, and PracticeEntries — all scoped to
 * that course. `Course.tagIds` simply disappears with it; the referenced
 * global `Tag` rows (a different database) are never touched.
 */
export async function deleteCourse(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction(
      "rw",
      [
        semesterDb.courses,
        semesterDb.units,
        semesterDb.contentBlocks,
        semesterDb.blobs,
        semesterDb.tasks,
        semesterDb.taskCompletionEvents,
        semesterDb.scheduleTemplates,
        semesterDb.scheduleOccurrences,
        semesterDb.gradeCategories,
        semesterDb.gradeEntries,
        semesterDb.gradeBoundaries,
        semesterDb.practiceEntries,
      ],
      async () => {
        const units = await semesterDb.units.where("courseId").equals(id).toArray();
        const unitIds = units.map((u) => u.id);

        const blocks = unitIds.length
          ? await semesterDb.contentBlocks.where("unitId").anyOf(unitIds).toArray()
          : [];
        const blobIds = blocks.filter(isBlobBackedBlock).map((b) => b.blobId);

        const courseTasks = await semesterDb.tasks.where("courseId").equals(id).toArray();
        const unitTasks = unitIds.length
          ? await semesterDb.tasks.where("unitId").anyOf(unitIds).toArray()
          : [];
        const taskIds = [...new Set([...courseTasks, ...unitTasks].map((t) => t.id))];
        const events = taskIds.length
          ? await semesterDb.taskCompletionEvents.where("taskId").anyOf(taskIds).toArray()
          : [];

        const templates = await semesterDb.scheduleTemplates.where("courseId").equals(id).toArray();
        const templateIds = templates.map((t) => t.id);
        const occurrences = templateIds.length
          ? await semesterDb.scheduleOccurrences
              .where("scheduleTemplateId")
              .anyOf(templateIds)
              .toArray()
          : [];

        const categories = await semesterDb.gradeCategories.where("courseId").equals(id).toArray();
        const entries = await semesterDb.gradeEntries.where("courseId").equals(id).toArray();
        const boundaries = await semesterDb.gradeBoundaries.where("courseId").equals(id).toArray();
        const coursePractice = await semesterDb.practiceEntries
          .where("courseId")
          .equals(id)
          .toArray();

        await Promise.all([
          semesterDb.units.bulkDelete(unitIds),
          semesterDb.contentBlocks.bulkDelete(blocks.map((b) => b.id)),
          semesterDb.blobs.bulkDelete(blobIds),
          semesterDb.tasks.bulkDelete(taskIds),
          semesterDb.taskCompletionEvents.bulkDelete(events.map((e) => e.id)),
          semesterDb.scheduleTemplates.bulkDelete(templateIds),
          semesterDb.scheduleOccurrences.bulkDelete(occurrences.map((o) => o.id)),
          semesterDb.gradeCategories.bulkDelete(categories.map((c) => c.id)),
          semesterDb.gradeEntries.bulkDelete(entries.map((e) => e.id)),
          semesterDb.gradeBoundaries.bulkDelete(boundaries.map((b) => b.id)),
          semesterDb.practiceEntries.bulkDelete(coursePractice.map((p) => p.id)),
          semesterDb.courses.delete(id),
        ]);
      },
    );
  });
}
