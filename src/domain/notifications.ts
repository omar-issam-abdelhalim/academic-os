/**
 * Class-reminder planning — pure logic for the Notification engine baseline
 * (PRODUCT_SPEC.md §9, ARCHITECTURE.md §"Notifications — platform
 * constraints"). Kept framework/Dexie/Notification-API free so it's
 * unit-testable without a browser; `src/features/shared/useClassReminders.ts`
 * is the only place that touches `Notification`/`setTimeout`/live queries.
 *
 * Implements exactly the two in-scope tiers:
 *   Tier 1 (required): "what's starting soon" — computed from data already
 *     loaded, no platform dependency.
 *   Tier 2 (best-effort): the same set of upcoming occurrences is what the
 *     hook schedules local `Notification`s for, while the tab is open.
 * Tier 3 (true background push) is explicitly out of scope — see
 * ARCHITECTURE.md.
 */
import { toIsoDate } from "@/domain/scheduleGeneration";
import { occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import type { ScheduleOccurrence } from "@/types/entities";

/** Reminder lead time. PRODUCT_SPEC.md §9 notes "future configurable
 * reminder timing" — this baseline ships one sensible, documented default
 * rather than a settings UI for it (an explicit, bounded scope choice, not
 * an oversight). */
export const REMINDER_LEAD_MINUTES = 10;

export interface UpcomingReminder {
  occurrence: ScheduleOccurrence;
  start: Date;
  minutesUntilStart: number;
}

/**
 * Which of today's schedule occurrences start within `leadMinutes` from
 * `now` and haven't started yet. Cancelled occurrences are excluded (there
 * is nothing to remind about); occurrences already in progress or finished
 * are excluded too — a reminder is only ever forward-looking. Sorted
 * soonest-first.
 */
export function findUpcomingReminders(
  occurrences: ScheduleOccurrence[],
  now: Date,
  leadMinutes: number = REMINDER_LEAD_MINUTES,
): UpcomingReminder[] {
  const todayIso = toIsoDate(now);
  const leadMs = leadMinutes * 60 * 1000;
  return occurrences
    .filter((o) => o.date === todayIso && o.status !== "cancelled")
    .map((o) => ({ occurrence: o, start: occurrenceDateTimes(o).start }))
    .filter(
      ({ start }) => start.getTime() > now.getTime() && start.getTime() - now.getTime() <= leadMs,
    )
    .map(({ occurrence, start }) => ({
      occurrence,
      start,
      minutesUntilStart: Math.max(1, Math.round((start.getTime() - now.getTime()) / 60000)),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** All of today's still-future, non-cancelled occurrences (not just those
 * already inside the lead window) — used by Tier 2 to schedule one timer
 * per class up front, rather than re-discovering it only once polling
 * happens to land inside the window. */
export function findTodaysFutureOccurrences(
  occurrences: ScheduleOccurrence[],
  now: Date,
): ScheduleOccurrence[] {
  const todayIso = toIsoDate(now);
  return occurrences.filter((o) => {
    if (o.date !== todayIso || o.status === "cancelled") return false;
    return occurrenceDateTimes(o).start.getTime() > now.getTime();
  });
}

/** The exact future moment (ms epoch) a Tier 2 notification should fire for
 * a given occurrence — `leadMinutes` before it starts, never in the past. */
export function reminderFireTime(
  occurrence: ScheduleOccurrence,
  leadMinutes: number = REMINDER_LEAD_MINUTES,
): number {
  return occurrenceDateTimes(occurrence).start.getTime() - leadMinutes * 60 * 1000;
}

/** Honest, factual copy — PRODUCT_SPEC.md §9's example format
 * ("CSAI 101 — Lecture — Starts at 09:00 — Room C201"), never implying a
 * guaranteed background alarm (that framing lives in the Settings hint
 * text, not here). */
export function formatReminderMessage(reminder: UpcomingReminder, courseName: string): string {
  const timeLabel = reminder.start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const locationPart = reminder.occurrence.location ? ` — ${reminder.occurrence.location}` : "";
  return `${courseName} — ${reminder.occurrence.type} — Starts at ${timeLabel}${locationPart}`;
}
