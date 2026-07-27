import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { semesterDb } from "@/data/db";
import {
  ensureOccurrencesForDates,
  markAttendance as markAttendanceRepo,
} from "@/data/repositories/scheduleRepository";
import { toIsoDate } from "@/domain/scheduleGeneration";
import type { ScheduleOccurrenceStatus } from "@/types/entities";

/**
 * Real, shared schedule-occurrence state for a set of calendar dates —
 * replaces Stage 2's `useFixtureSchedule`. Occurrences are generated
 * lazily (DATA_MODEL.md §"Generation strategy"): an effect materializes
 * any missing occurrences for `dates` on mount/date-range change, and a
 * separate live query reads them back reactively, so marking attendance
 * anywhere (Home, Day Detail, the desktop grid) is reflected everywhere
 * else immediately.
 */
export function useOccurrencesForDates(dates: Date[]) {
  const isoDates = dates.map(toIsoDate);
  const isoKey = isoDates.join(",");

  useEffect(() => {
    if (dates.length === 0) return;
    void ensureOccurrencesForDates(dates);
    // Only the date range identity should re-trigger materialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isoKey]);

  const occurrences = useLiveQuery(async () => {
    if (isoDates.length === 0) return [];
    return semesterDb.scheduleOccurrences.where("date").anyOf(isoDates).toArray();
  }, [isoKey]);

  return occurrences ?? [];
}

export async function markAttendance(id: string, status: ScheduleOccurrenceStatus): Promise<void> {
  await markAttendanceRepo(id, status);
}
