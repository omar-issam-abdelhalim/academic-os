import type { ScheduleOccurrence } from "@/types/entities";

/** Combines an occurrence's denormalized `date` + `startTime`/`endTime`
 * into concrete local Date objects. */
export function occurrenceDateTimes(occurrence: ScheduleOccurrence): { start: Date; end: Date } {
  const [year, month, day] = occurrence.date.split("-").map(Number);
  const [startH, startM] = occurrence.startTime.split(":").map(Number);
  const [endH, endM] = occurrence.endTime.split(":").map(Number);
  const start = new Date(year!, (month ?? 1) - 1, day, startH, startM);
  const end = new Date(year!, (month ?? 1) - 1, day, endH, endM);
  return { start, end };
}

export type TodayScheduleResult =
  { kind: "in-progress" | "next"; occurrence: ScheduleOccurrence } | { kind: "none" };

/**
 * Home's current-or-next-class priority (STAGE_1A_UX_ARCHITECTURE.md §G):
 * an in-progress class wins over a merely upcoming one; if today has no
 * more classes, returns "none" rather than a stale finished class
 * (product-owner Revision C).
 */
export function findCurrentOrNextToday(
  occurrences: ScheduleOccurrence[],
  now: Date = new Date(),
): TodayScheduleResult {
  const todayIso = now.toISOString().slice(0, 10);
  const todays = occurrences
    .filter((o) => o.date === todayIso)
    .map((o) => ({ occurrence: o, ...occurrenceDateTimes(o) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const inProgress = todays.find((o) => now >= o.start && now < o.end);
  if (inProgress) return { kind: "in-progress", occurrence: inProgress.occurrence };

  const next = todays.find((o) => now < o.start);
  if (next) return { kind: "next", occurrence: next.occurrence };

  return { kind: "none" };
}

/** Remaining classes today, later than "now" or currently in progress — for
 * Home's secondary "rest of today's schedule" list. */
export function restOfToday(
  occurrences: ScheduleOccurrence[],
  now: Date = new Date(),
): ScheduleOccurrence[] {
  const todayIso = now.toISOString().slice(0, 10);
  return occurrences
    .filter((o) => o.date === todayIso)
    .filter((o) => occurrenceDateTimes(o).end > now)
    .sort(
      (a, b) => occurrenceDateTimes(a).start.getTime() - occurrenceDateTimes(b).start.getTime(),
    );
}
