/**
 * Task analytics (Stage 4). Reads `Task.completed` for the current-state
 * completion rate (the same derived field every other screen already
 * trusts — DATA_MODEL.md §TaskCompletionEvent) and `TaskCompletionEvent`
 * for recent-activity signals, so toggling a task back and forth never
 * loses or fabricates history: the event log is the only place "recent
 * completions" are counted from.
 */
import { isOverdue } from "@/domain/academicWeek";
import type { Task, TaskCompletionEvent } from "@/types/entities";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface TaskMetrics {
  totalRelevant: number;
  completed: number;
  incomplete: number;
  /** undefined (never 0) when there are no relevant tasks at all — "no
   * tasks yet" and "0% completed" are not the same claim. */
  completionRate: number | undefined;
  overdueCount: number;
  /** TaskCompletionEvent(toggledTo: true) in the last 7 days. */
  recentCompletions: number;
  /** The 7 days before that — a simple two-window comparison for
   * "recent activity," deliberately not a formal trend classification
   * (weekly task volume is too noisy/low-N for that to be meaningful). */
  priorWeekCompletions: number;
}

export function computeTaskMetrics(
  tasks: Task[],
  completionEvents: TaskCompletionEvent[],
  now: Date = new Date(),
): TaskMetrics {
  const totalRelevant = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const incomplete = totalRelevant - completed;
  const completionRate = totalRelevant > 0 ? (completed / totalRelevant) * 100 : undefined;
  const overdueCount = tasks.filter(
    (t) => !t.completed && t.dueDate && isOverdue(new Date(t.dueDate), now),
  ).length;

  const relevantTaskIds = new Set(tasks.map((t) => t.id));
  const nowMs = now.getTime();
  const relevantCompletions = completionEvents.filter(
    (e) => e.toggledTo && relevantTaskIds.has(e.taskId),
  );
  const recentCompletions = relevantCompletions.filter((e) => {
    const age = nowMs - new Date(e.at).getTime();
    return age >= 0 && age <= ONE_WEEK_MS;
  }).length;
  const priorWeekCompletions = relevantCompletions.filter((e) => {
    const age = nowMs - new Date(e.at).getTime();
    return age > ONE_WEEK_MS && age <= ONE_WEEK_MS * 2;
  }).length;

  return {
    totalRelevant,
    completed,
    incomplete,
    completionRate,
    overdueCount,
    recentCompletions,
    priorWeekCompletions,
  };
}

export function computeTaskMetricsByCourse(
  tasks: Task[],
  completionEvents: TaskCompletionEvent[],
  courseId: string,
  now: Date = new Date(),
): TaskMetrics {
  return computeTaskMetrics(
    tasks.filter((t) => t.courseId === courseId),
    completionEvents,
    now,
  );
}
