import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import { occurrenceKey, planOccurrences, toIsoDate } from "@/domain/scheduleGeneration";
import type {
  ScheduleOccurrence,
  ScheduleOccurrenceStatus,
  ScheduleTemplate,
} from "@/types/entities";

export async function listTemplatesForCourse(courseId: string): Promise<ScheduleTemplate[]> {
  return withStorageErrorHandling(() =>
    semesterDb.scheduleTemplates.where("courseId").equals(courseId).toArray(),
  );
}

export async function listActiveTemplates(): Promise<ScheduleTemplate[]> {
  return withStorageErrorHandling(async () => {
    const all = await semesterDb.scheduleTemplates.toArray();
    return all.filter((t) => t.active);
  });
}

export interface CreateTemplateInput {
  courseId: string;
  type: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  location?: string;
  instructor?: string;
}

export async function createTemplate(input: CreateTemplateInput): Promise<ScheduleTemplate> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const template: ScheduleTemplate = {
      id: createId(),
      courseId: input.courseId,
      type: input.type,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      instructor: input.instructor,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.scheduleTemplates.put(template);
    return template;
  });
}

export type UpdateTemplateInput = Partial<
  Pick<
    ScheduleTemplate,
    "type" | "dayOfWeek" | "startTime" | "endTime" | "location" | "instructor" | "active"
  >
>;

/** Editing a template changes the *pattern going forward only* —
 * PRODUCT_SPEC.md §8/DATA_MODEL.md: it never rewrites the denormalized
 * snapshot already copied onto past ScheduleOccurrence rows. */
export async function updateTemplate(id: string, patch: UpdateTemplateInput): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.scheduleTemplates.update(id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  });
}

/** Deleting a ScheduleTemplate does NOT delete existing ScheduleOccurrences
 * — they retain their denormalized snapshot and remain valid historical
 * attendance records; it only stops generating future occurrences
 * (DATA_MODEL.md). */
export async function deleteTemplate(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.scheduleTemplates.delete(id);
  });
}

/**
 * Lazily materializes any missing ScheduleOccurrence rows implied by the
 * active templates for the given calendar dates (DATA_MODEL.md
 * §"Generation strategy": generated on demand when a week is viewed or
 * attendance is marked, never pre-materialized for a whole semester), then
 * returns every occurrence — old and newly created — for those dates.
 * Idempotent: calling this again for the same dates creates nothing new.
 */
export async function ensureOccurrencesForDates(dates: Date[]): Promise<ScheduleOccurrence[]> {
  return withStorageErrorHandling(async () => {
    const isoDates = dates.map(toIsoDate);
    return semesterDb.transaction(
      "rw",
      semesterDb.scheduleTemplates,
      semesterDb.scheduleOccurrences,
      async () => {
        const templates = await semesterDb.scheduleTemplates.toArray();
        const activeTemplates = templates.filter((t) => t.active);
        const existing = isoDates.length
          ? await semesterDb.scheduleOccurrences.where("date").anyOf(isoDates).toArray()
          : [];
        const existingKeys = new Set(
          existing.map((o) => occurrenceKey(o.scheduleTemplateId, o.date)),
        );

        const planned = planOccurrences(activeTemplates, dates, existingKeys);
        if (planned.length > 0) {
          const now = new Date().toISOString();
          const rows: ScheduleOccurrence[] = planned.map((p) => ({
            ...p,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          }));
          await semesterDb.scheduleOccurrences.bulkPut(rows);
          return [...existing, ...rows];
        }
        return existing;
      },
    );
  });
}

export async function listOccurrencesForCourse(courseId: string): Promise<ScheduleOccurrence[]> {
  return withStorageErrorHandling(() =>
    semesterDb.scheduleOccurrences.where("courseId").equals(courseId).toArray(),
  );
}

export async function getOccurrence(id: string): Promise<ScheduleOccurrence | undefined> {
  return withStorageErrorHandling(() => semesterDb.scheduleOccurrences.get(id));
}

/** Marks (or corrects) attendance for a specific occurrence. Cancelled
 * sessions are excluded from the attendance-percentage denominator
 * elsewhere (domain/attendancePresentation.ts consumers) — this repository
 * just records the chosen status honestly, never inferring it. */
export async function markAttendance(
  id: string,
  status: ScheduleOccurrenceStatus,
  notes?: string,
): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.scheduleOccurrences.update(id, {
      status,
      notes,
      updatedAt: new Date().toISOString(),
    });
  });
}
