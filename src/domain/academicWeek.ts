/**
 * The single, centralized Saturday→Friday academic-week utility.
 *
 * PRODUCT_SPEC.md §6 / Cross-Cutting Invariant #5: "The academic week is
 * always Saturday 00:00:00 → Friday 23:59:59.999 local time, computed by
 * one shared utility." No feature may re-derive week boundaries
 * independently — every screen that groups or buckets by week (Tasks,
 * Schedule, attendance-by-week, Weekly Check-in) must import from here.
 *
 * All calculations use *local* time (per spec) via the Date constructor's
 * local-time semantics, not UTC — deliberately, since a student's "week"
 * is anchored to their own clock, not UTC.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** JS Date#getDay(): 0=Sun..6=Sat. Distance forward from Saturday. */
function daysSinceSaturday(jsDay: number): number {
  return (jsDay + 1) % 7;
}

export interface AcademicWeek {
  /** Saturday 00:00:00.000 local time. */
  start: Date;
  /** Friday 23:59:59.999 local time. */
  end: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Returns the Saturday–Friday academic week containing `date`. */
export function getAcademicWeek(date: Date): AcademicWeek {
  const day = startOfDay(date);
  const back = daysSinceSaturday(day.getDay());
  const start = new Date(day.getTime() - back * DAY_MS);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** True if `a` and `b` fall in the same Saturday–Friday academic week. */
export function isSameAcademicWeek(a: Date, b: Date): boolean {
  return getAcademicWeek(a).start.getTime() === getAcademicWeek(b).start.getTime();
}

/** Shifts `date` by `n` academic weeks (may be negative), preserving time-of-day. */
export function addAcademicWeeks(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 7 * DAY_MS);
}

/** True if `date` falls strictly before the start of today's academic week. */
export function isOverdue(date: Date, now: Date = new Date()): boolean {
  return startOfDay(date).getTime() < startOfDay(now).getTime();
}

/** True if `date` is the same calendar day as `now`. */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return startOfDay(date).getTime() === startOfDay(now).getTime();
}

/**
 * Buckets `date` relative to `now` for the Tasks screen (PRODUCT_SPEC.md §6):
 * Overdue / Today / Upcoming. Callers with no due date handle that
 * separately — this function assumes a concrete date.
 */
export type TaskBucket = "overdue" | "today" | "upcoming";

export function bucketForDate(date: Date, now: Date = new Date()): TaskBucket {
  if (isOverdue(date, now)) return "overdue";
  if (isToday(date, now)) return "today";
  return "upcoming";
}

/** Formats an academic week's range for a collapsed section header, e.g. "Aug 2–8". */
export function formatWeekRange(week: AcademicWeek): string {
  const startMonth = week.start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = week.end.toLocaleDateString(undefined, { month: "short" });
  const startDay = week.start.getDate();
  const endDay = week.end.getDate();
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export const DAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** Returns the 7 dates (Sat..Fri) of the academic week containing `date`. */
export function academicWeekDays(date: Date): Date[] {
  const { start } = getAcademicWeek(date);
  return Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}
