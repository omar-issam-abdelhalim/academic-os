import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { preferencesDb, semesterDb } from "@/data/db";
import { ensureOccurrencesForDates } from "@/data/repositories/scheduleRepository";
import { listCourses } from "@/data/repositories/courseRepository";
import { toIsoDate } from "@/domain/scheduleGeneration";
import { occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import type { ScheduleOccurrence } from "@/types/entities";
import {
  REMINDER_LEAD_MINUTES,
  findTodaysFutureOccurrences,
  findUpcomingReminders,
  formatReminderMessage,
  reminderFireTime,
} from "@/domain/notifications";

const POLL_INTERVAL_MS = 30_000;

export interface ActiveReminder {
  occurrenceId: string;
  message: string;
}

/**
 * Notification engine baseline (ARCHITECTURE.md §"Notifications —
 * platform constraints", PRODUCT_SPEC.md §9). Mounted once at the
 * app-shell level (`ClassReminderBanner`) so it's active regardless of
 * which screen is open. Both tiers are gated behind the existing
 * `AppPreferences.notificationsEnabled` "Class reminders" toggle — turning
 * it off stops both, matching the single control Settings already exposes.
 *
 * Tier 1 (required, always available while the tab is open): recomputes
 * "what's starting soon" on mount, on window focus, and on a light poll
 * (so a tab left open and idle still surfaces a reminder) — no platform
 * dependency.
 *
 * Tier 2 (best-effort): schedules a real `Notification` via `setTimeout`
 * for every still-future class today, only if the browser's Notification
 * permission is already `"granted"` (requested explicitly when the user
 * turns the Settings toggle on — never auto-prompted here). Degrades
 * silently to nothing if the API is unavailable, permission isn't
 * granted, or the tab isn't open when the timer would have fired — this
 * is never presented as a guaranteed background alarm.
 *
 * Tier 3 (true OS-level background push) is explicitly out of scope.
 */
export function useClassReminders(): {
  activeReminder: ActiveReminder | null;
  dismiss: () => void;
} {
  const preferences = useLiveQuery(() => preferencesDb.appPreferences.get("singleton"), []);
  const notificationsEnabled = preferences?.notificationsEnabled ?? false;

  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);
  const coursesQuery = useLiveQuery(() => listCourses(), []);
  const courses = useMemo(() => coursesQuery ?? [], [coursesQuery]);
  const courseNameById = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses]);

  const todayIso = toIsoDate(new Date());

  useEffect(() => {
    if (!semester || !notificationsEnabled) return;
    void ensureOccurrencesForDates([new Date()]);
  }, [semester, notificationsEnabled, todayIso]);

  const occurrences = useLiveQuery(
    () =>
      notificationsEnabled
        ? semesterDb.scheduleOccurrences.where("date").equals(todayIso).toArray()
        : Promise.resolve<ScheduleOccurrence[]>([]),
    [notificationsEnabled, todayIso],
  );

  // Forces a recheck of "what's starting soon" — Tier 1's "on load/focus"
  // baseline, generalized with a light poll for a tab left open and idle.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!notificationsEnabled) return;
    function recheck() {
      setTick((t) => t + 1);
    }
    const interval = setInterval(recheck, POLL_INTERVAL_MS);
    window.addEventListener("focus", recheck);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", recheck);
    };
  }, [notificationsEnabled]);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeReminder = useMemo<ActiveReminder | null>(() => {
    if (!notificationsEnabled || !occurrences) return null;
    const [soonest] = findUpcomingReminders(occurrences, new Date());
    if (!soonest || dismissedIds.has(soonest.occurrence.id)) return null;
    const courseName = courseNameById.get(soonest.occurrence.courseId) ?? "Class";
    return {
      occurrenceId: soonest.occurrence.id,
      message: formatReminderMessage(soonest, courseName),
    };
    // `tick` intentionally forces this to recompute against a fresh `new
    // Date()` on every poll/focus even though it isn't read directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrences, notificationsEnabled, courseNameById, dismissedIds, tick]);

  useEffect(() => {
    if (!notificationsEnabled || !occurrences) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const now = new Date();
    const timeouts = findTodaysFutureOccurrences(occurrences, now)
      .map((occurrence) => {
        const delay = reminderFireTime(occurrence, REMINDER_LEAD_MINUTES) - now.getTime();
        if (delay <= 0) return null; // already inside the lead window — Tier 1's banner covers it
        const courseName = courseNameById.get(occurrence.courseId) ?? "Class";
        return setTimeout(() => {
          const message = formatReminderMessage(
            {
              occurrence,
              start: occurrenceDateTimes(occurrence).start,
              minutesUntilStart: REMINDER_LEAD_MINUTES,
            },
            courseName,
          );
          new Notification("Academic OS", { body: message });
        }, delay);
      })
      .filter((id): id is ReturnType<typeof setTimeout> => id !== null);

    return () => timeouts.forEach(clearTimeout);
  }, [occurrences, notificationsEnabled, courseNameById]);

  return {
    activeReminder,
    dismiss: () => {
      if (activeReminder) {
        setDismissedIds((prev) => new Set(prev).add(activeReminder.occurrenceId));
      }
    },
  };
}
