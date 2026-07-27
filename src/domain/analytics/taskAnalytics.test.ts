import { describe, expect, it } from "vitest";
import { computeTaskMetrics, computeTaskMetricsByCourse } from "./taskAnalytics";
import type { Task, TaskCompletionEvent } from "@/types/entities";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "Task",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeTaskMetrics", () => {
  it("reports undefined completion rate (never 0%) when there are no tasks", () => {
    const metrics = computeTaskMetrics([], []);
    expect(metrics.totalRelevant).toBe(0);
    expect(metrics.completionRate).toBeUndefined();
  });

  it("computes completion rate as completed/total, not an average of anything", () => {
    const tasks = [
      makeTask({ id: "a", completed: true }),
      makeTask({ id: "b", completed: true }),
      makeTask({ id: "c", completed: false }),
      makeTask({ id: "d", completed: false }),
    ];
    const metrics = computeTaskMetrics(tasks, []);
    expect(metrics.completed).toBe(2);
    expect(metrics.incomplete).toBe(2);
    expect(metrics.completionRate).toBe(50);
  });

  it("counts only incomplete tasks with a past due date as overdue", () => {
    const now = new Date(2026, 6, 15);
    const tasks = [
      makeTask({ id: "a", completed: false, dueDate: "2026-07-01" }), // overdue
      makeTask({ id: "b", completed: true, dueDate: "2026-07-01" }), // completed, not overdue
      makeTask({ id: "c", completed: false, dueDate: "2026-07-20" }), // future, not overdue
      makeTask({ id: "d", completed: false }), // no due date
    ];
    const metrics = computeTaskMetrics(tasks, [], now);
    expect(metrics.overdueCount).toBe(1);
  });

  it("counts recent completions only from TaskCompletionEvent history, respecting the toggle window", () => {
    const now = new Date(2026, 6, 15);
    const tasks = [makeTask({ id: "a" })];
    const events: TaskCompletionEvent[] = [
      { id: "e1", taskId: "a", toggledTo: true, at: "2026-07-14T00:00:00.000Z" }, // 1 day ago -> recent
      { id: "e2", taskId: "a", toggledTo: false, at: "2026-07-14T12:00:00.000Z" }, // toggled off, not counted
      { id: "e3", taskId: "a", toggledTo: true, at: "2026-07-05T00:00:00.000Z" }, // 10 days ago -> prior week
    ];
    const metrics = computeTaskMetrics(tasks, events, now);
    expect(metrics.recentCompletions).toBe(1);
    expect(metrics.priorWeekCompletions).toBe(1);
  });

  it("ignores completion events for tasks outside the given scope", () => {
    const now = new Date(2026, 6, 15);
    const tasks = [makeTask({ id: "a", courseId: "course-1" })];
    const events: TaskCompletionEvent[] = [
      { id: "e1", taskId: "unrelated-task", toggledTo: true, at: "2026-07-14T00:00:00.000Z" },
    ];
    const metrics = computeTaskMetricsByCourse(tasks, events, "course-1", now);
    expect(metrics.recentCompletions).toBe(0);
  });

  it("scopes metrics to a single course", () => {
    const tasks = [
      makeTask({ id: "a", courseId: "course-1", completed: true }),
      makeTask({ id: "b", courseId: "course-2", completed: false }),
    ];
    const metrics = computeTaskMetricsByCourse(tasks, [], "course-1");
    expect(metrics.totalRelevant).toBe(1);
    expect(metrics.completionRate).toBe(100);
  });
});
