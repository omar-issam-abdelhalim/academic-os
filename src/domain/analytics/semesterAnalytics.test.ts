import { describe, expect, it } from "vitest";
import { computeSemesterAnalytics } from "./semesterAnalytics";
import type { Course, GradeEntry, Task } from "@/types/entities";

function makeCourse(id: string, name: string): Course {
  return { id, name, tagIds: [], order: 0, createdAt: "", updatedAt: "" };
}

describe("computeSemesterAnalytics", () => {
  it("combines courses of very different sizes as a ratio of sums, never a naive average of percentages", () => {
    const courses = [makeCourse("small", "Small Course"), makeCourse("big", "Big Course")];
    // Small course: 1/1 tasks complete (100%). Big course: 1/9 tasks complete (~11%).
    // Naive average of percentages would read ~55.5%; the honest combined
    // rate is 2 completed of 10 total = 20%.
    const tasks: Task[] = [
      { id: "s1", courseId: "small", title: "t", completed: true, createdAt: "", updatedAt: "" },
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `b${i}`,
        courseId: "big",
        title: "t",
        completed: i === 0,
        createdAt: "",
        updatedAt: "",
      })),
    ];

    const analytics = computeSemesterAnalytics({
      courses,
      tasks,
      taskCompletionEvents: [],
      occurrences: [],
      gradeEntries: [],
      practiceEntries: [],
    });

    expect(analytics.tasks.completionRate).toBe(20);
  });

  it("produces a distinct per-course profile for every course, including courses with no data at all", () => {
    const courses = [makeCourse("a", "Course A"), makeCourse("b", "Course B")];
    const gradeEntries: GradeEntry[] = [
      {
        id: "1",
        courseId: "a",
        label: "Quiz",
        scoreEarned: 5,
        scoreMax: 5,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const analytics = computeSemesterAnalytics({
      courses,
      tasks: [],
      taskCompletionEvents: [],
      occurrences: [],
      gradeEntries,
      practiceEntries: [],
    });

    expect(analytics.courses).toHaveLength(2);
    const courseA = analytics.courses.find((c) => c.course.id === "a")!;
    const courseB = analytics.courses.find((c) => c.course.id === "b")!;
    expect(courseA.grades.performancePercent).toBe(100);
    expect(courseB.grades.performancePercent).toBeUndefined();
  });

  it("returns undefined semester-wide metrics (not zero) when there is no data at all", () => {
    const analytics = computeSemesterAnalytics({
      courses: [],
      tasks: [],
      taskCompletionEvents: [],
      occurrences: [],
      gradeEntries: [],
      practiceEntries: [],
    });
    expect(analytics.tasks.completionRate).toBeUndefined();
    expect(analytics.attendance.attendanceRate).toBeUndefined();
    expect(analytics.grades.performancePercent).toBeUndefined();
    expect(analytics.practice.normalizedPercent).toBeUndefined();
    expect(analytics.courses).toEqual([]);
  });
});
