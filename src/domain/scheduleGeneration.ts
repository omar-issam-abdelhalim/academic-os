import type { ScheduleOccurrence, ScheduleTemplate } from "@/types/entities";

/**
 * Pure planning logic for DATA_MODEL.md §"ScheduleTemplate vs.
 * ScheduleOccurrence": occurrences are generated *lazily* when a week is
 * viewed or attendance is marked, never pre-materialized for a whole
 * semester up front. This module only computes *what* occurrences a set
 * of templates implies for a set of calendar dates — it never touches
 * Dexie; `scheduleRepository` is the only place that persists the result,
 * so this stays unit-testable without a browser.
 */

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** JS `Date#getDay()` (0=Sun..6=Sat) mapped to this app's academic-week
 * numbering (0=Sat..6=Fri) — the same convention `ScheduleTemplate.dayOfWeek`
 * and `academicWeek.ts` use throughout. */
export function toAppDayOfWeek(jsDay: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return ((jsDay + 1) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export type PlannedOccurrence = Omit<ScheduleOccurrence, "id" | "createdAt" | "updatedAt">;

/** The denormalized snapshot (courseId/type/startTime/endTime/location)
 * copied from the template at occurrence-creation time — DATA_MODEL.md is
 * explicit that this must never re-read the template later, so a
 * subsequent template edit/deletion can't silently change a past
 * attendance record's meaning. */
export function buildOccurrenceForDate(template: ScheduleTemplate, date: Date): PlannedOccurrence {
  return {
    scheduleTemplateId: template.id,
    date: toIsoDate(date),
    status: "unmarked",
    courseId: template.courseId,
    type: template.type,
    startTime: template.startTime,
    endTime: template.endTime,
    location: template.location,
  };
}

export function occurrenceKey(templateId: string, isoDate: string): string {
  return `${templateId}|${isoDate}`;
}

/**
 * For every active template whose `dayOfWeek` matches one of `dates`,
 * determines whether an occurrence already exists (`existingKeys`) and
 * returns the ones that still need to be created. Inactive/paused
 * templates (`active: false`) never generate new occurrences, but any
 * occurrences they already generated are untouched (they're a separate,
 * already-persisted record).
 */
export function planOccurrences(
  templates: ScheduleTemplate[],
  dates: Date[],
  existingKeys: ReadonlySet<string>,
): PlannedOccurrence[] {
  const planned: PlannedOccurrence[] = [];
  for (const date of dates) {
    const dow = toAppDayOfWeek(date.getDay());
    const iso = toIsoDate(date);
    for (const template of templates) {
      if (!template.active || template.dayOfWeek !== dow) continue;
      if (existingKeys.has(occurrenceKey(template.id, iso))) continue;
      planned.push(buildOccurrenceForDate(template, date));
    }
  }
  return planned;
}
