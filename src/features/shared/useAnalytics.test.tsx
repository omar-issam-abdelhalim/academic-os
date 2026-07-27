import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { semesterDb } from "@/data/db";
import { createCourse } from "@/data/repositories/courseRepository";
import { createTask, toggleTaskCompletion } from "@/data/repositories/taskRepository";
import { createGradeEntry, deleteGradeEntry } from "@/data/repositories/gradeRepository";
import { useSemesterAnalytics, useInsights } from "./useAnalytics";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

function AnalyticsProbe() {
  const analytics = useSemesterAnalytics();
  const insights = useInsights(1);
  if (!analytics) return <div data-testid="loading">loading</div>;
  return (
    <div>
      <div data-testid="task-rate">{analytics.tasks.completionRate ?? "no-data"}</div>
      <div data-testid="grade-rate">{analytics.grades.performancePercent ?? "no-data"}</div>
      <div data-testid="course-count">{analytics.courses.length}</div>
      <div data-testid="top-insight">{insights?.[0]?.category ?? "none"}</div>
    </div>
  );
}

describe("useSemesterAnalytics / useInsights (real Dexie integration)", () => {
  it("reflects real persisted data reactively — no data first, then updates after mutation", async () => {
    render(<AnalyticsProbe />);

    await waitFor(() => expect(screen.getByTestId("task-rate")).toHaveTextContent("no-data"));
    expect(screen.getByTestId("course-count")).toHaveTextContent("0");
    expect(screen.getByTestId("top-insight")).toHaveTextContent("onboarding");

    const course = await createCourse({ name: "CSAI 101" });
    await waitFor(() => expect(screen.getByTestId("course-count")).toHaveTextContent("1"));

    const task = await createTask({ title: "Read chapter 1", courseId: course.id });
    await waitFor(() => expect(screen.getByTestId("task-rate")).toHaveTextContent("0"));

    await toggleTaskCompletion(task.id, true);
    await waitFor(() => expect(screen.getByTestId("task-rate")).toHaveTextContent("100"));
  });

  it("updates grade analytics immediately after adding, and again after deleting, a grade entry", async () => {
    const course = await createCourse({ name: "MATH 202" });
    render(<AnalyticsProbe />);
    await waitFor(() => expect(screen.getByTestId("grade-rate")).toHaveTextContent("no-data"));

    const entry = await createGradeEntry({
      courseId: course.id,
      label: "Quiz 1",
      scoreEarned: 5,
      scoreMax: 10,
    });
    await waitFor(() => expect(screen.getByTestId("grade-rate")).toHaveTextContent("50"));

    await deleteGradeEntry(entry.id);
    await waitFor(() => expect(screen.getByTestId("grade-rate")).toHaveTextContent("no-data"));
  });
});
