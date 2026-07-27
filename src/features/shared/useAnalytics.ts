import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { semesterDb } from "@/data/db";
import {
  computeSemesterAnalytics,
  type SemesterAnalytics,
} from "@/domain/analytics/semesterAnalytics";
import { generateInsights, type Insight } from "@/domain/analytics/insights";

/**
 * The single reactive source for Stage 4 analytics — reads every table the
 * analytics domain layer needs via `useLiveQuery` (so it recomputes
 * automatically whenever a task/attendance/grade/practice/course record
 * changes anywhere in the app) and feeds them through the pure
 * `computeSemesterAnalytics` function via `useMemo` (so the actual math
 * only reruns when the underlying data identity actually changes, not on
 * every unrelated re-render). Returns `undefined` while the initial
 * queries are still loading — never a half-computed or fake-zero result.
 */
export function useSemesterAnalytics(): SemesterAnalytics | undefined {
  const coursesQuery = useLiveQuery(() => semesterDb.courses.toArray(), []);
  const tasksQuery = useLiveQuery(() => semesterDb.tasks.toArray(), []);
  const eventsQuery = useLiveQuery(() => semesterDb.taskCompletionEvents.toArray(), []);
  const occurrencesQuery = useLiveQuery(() => semesterDb.scheduleOccurrences.toArray(), []);
  const gradeEntriesQuery = useLiveQuery(() => semesterDb.gradeEntries.toArray(), []);
  const practiceEntriesQuery = useLiveQuery(() => semesterDb.practiceEntries.toArray(), []);

  return useMemo(() => {
    if (
      coursesQuery === undefined ||
      tasksQuery === undefined ||
      eventsQuery === undefined ||
      occurrencesQuery === undefined ||
      gradeEntriesQuery === undefined ||
      practiceEntriesQuery === undefined
    ) {
      return undefined;
    }
    return computeSemesterAnalytics({
      courses: coursesQuery,
      tasks: tasksQuery,
      taskCompletionEvents: eventsQuery,
      occurrences: occurrencesQuery,
      gradeEntries: gradeEntriesQuery,
      practiceEntries: practiceEntriesQuery,
    });
  }, [
    coursesQuery,
    tasksQuery,
    eventsQuery,
    occurrencesQuery,
    gradeEntriesQuery,
    practiceEntriesQuery,
  ]);
}

/** Same reactive source, already run through the insight engine and
 * ranked. `limit` truncates the ranked list — it never changes the
 * ranking itself, so Home (limit 1) and Performance (limit N) always agree
 * on which insight is "the most important one." */
export function useInsights(limit?: number): Insight[] | undefined {
  const analytics = useSemesterAnalytics();
  return useMemo(() => {
    if (!analytics) return undefined;
    const all = generateInsights(analytics);
    return limit === undefined ? all : all.slice(0, limit);
  }, [analytics, limit]);
}
