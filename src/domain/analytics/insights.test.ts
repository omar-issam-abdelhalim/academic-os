import { describe, expect, it } from "vitest";
import { generateInsights } from "./insights";
import type { SemesterAnalytics } from "./semesterAnalytics";
import type { CourseAnalyticsProfile } from "./courseAnalytics";
import type { TaskMetrics } from "./taskAnalytics";
import type { AttendanceMetrics } from "./attendanceAnalytics";
import type { GradeMetrics } from "./gradeAnalytics";
import type { PracticeMetrics } from "./practiceAnalytics";
import type { Course } from "@/types/entities";
import { classifyTrend, type TrendResult } from "./trend";

const NO_TREND: TrendResult = { trend: "insufficient-data", pointCount: 0 };

function taskMetrics(overrides: Partial<TaskMetrics> = {}): TaskMetrics {
  return {
    totalRelevant: 0,
    completed: 0,
    incomplete: 0,
    completionRate: undefined,
    overdueCount: 0,
    recentCompletions: 0,
    priorWeekCompletions: 0,
    ...overrides,
  };
}

function attendanceMetrics(overrides: Partial<AttendanceMetrics> = {}): AttendanceMetrics {
  return {
    attended: 0,
    missed: 0,
    cancelled: 0,
    unmarked: 0,
    attendanceRate: undefined,
    trend: NO_TREND,
    weeklyRates: [],
    ...overrides,
  };
}

function gradeMetrics(overrides: Partial<GradeMetrics> = {}): GradeMetrics {
  return {
    recordedEarned: 0,
    recordedMax: 0,
    performancePercent: undefined,
    entryCount: 0,
    trend: NO_TREND,
    series: [],
    ...overrides,
  };
}

function practiceMetrics(overrides: Partial<PracticeMetrics> = {}): PracticeMetrics {
  return {
    recordedEarned: 0,
    recordedMax: 0,
    normalizedPercent: undefined,
    entryCount: 0,
    trend: NO_TREND,
    series: [],
    ...overrides,
  };
}

function course(id: string, name: string): Course {
  return { id, name, tagIds: [], order: 0, createdAt: "", updatedAt: "" };
}

function courseProfile(
  overrides: Partial<CourseAnalyticsProfile> & { course: Course },
): CourseAnalyticsProfile {
  return {
    tasks: taskMetrics(),
    attendance: attendanceMetrics(),
    grades: gradeMetrics(),
    practice: practiceMetrics(),
    ...overrides,
  };
}

function semester(overrides: Partial<SemesterAnalytics> = {}): SemesterAnalytics {
  return {
    tasks: taskMetrics(),
    attendance: attendanceMetrics(),
    grades: gradeMetrics(),
    practice: practiceMetrics(),
    courses: [],
    ...overrides,
  };
}

describe("generateInsights", () => {
  it("returns a single onboarding insight when there is no data of any kind", () => {
    const insights = generateInsights(semester());
    expect(insights).toHaveLength(1);
    expect(insights[0]!.category).toBe("onboarding");
  });

  it("surfaces overdue tasks as an attention insight", () => {
    const insights = generateInsights(
      semester({ tasks: taskMetrics({ totalRelevant: 5, overdueCount: 2 }) }),
    );
    const overdue = insights.find((i) => i.category === "overdue");
    expect(overdue).toBeDefined();
    expect(overdue!.severity).toBe("attention");
    expect(overdue!.message).toContain("2 overdue tasks");
  });

  it("identifies the single course with the lowest task completion rate, ignoring courses with too few tasks", () => {
    const weak = courseProfile({
      course: course("weak", "Weak Course"),
      tasks: taskMetrics({ totalRelevant: 10, completed: 3, completionRate: 30 }),
    });
    const tooFewTasks = courseProfile({
      course: course("tiny", "Tiny Course"),
      tasks: taskMetrics({ totalRelevant: 1, completed: 0, completionRate: 0 }),
    });
    const insights = generateInsights(
      semester({
        tasks: taskMetrics({ totalRelevant: 11, completed: 3, completionRate: 27 }),
        courses: [weak, tooFewTasks],
      }),
    );
    const insight = insights.find((i) => i.category === "task-completion");
    expect(insight).toBeDefined();
    expect(insight!.courseId).toBe("weak");
  });

  it("never flags a course whose completion rate is at or above the low-completion threshold", () => {
    const healthy = courseProfile({
      course: course("healthy", "Healthy Course"),
      tasks: taskMetrics({ totalRelevant: 10, completed: 8, completionRate: 80 }),
    });
    const insights = generateInsights(semester({ courses: [healthy] }));
    expect(insights.find((i) => i.category === "task-completion")).toBeUndefined();
  });

  it("identifies both the weakest and strongest recorded-grade courses", () => {
    const weak = courseProfile({
      course: course("weak", "Weak Grades"),
      grades: gradeMetrics({
        entryCount: 3,
        performancePercent: 50,
        recordedEarned: 5,
        recordedMax: 10,
      }),
    });
    const strong = courseProfile({
      course: course("strong", "Strong Grades"),
      grades: gradeMetrics({
        entryCount: 3,
        performancePercent: 95,
        recordedEarned: 19,
        recordedMax: 20,
      }),
    });
    const insights = generateInsights(
      semester({ grades: gradeMetrics({ entryCount: 6 }), courses: [weak, strong] }),
    );
    const low = insights.find((i) => i.category === "grade-level" && i.severity === "attention");
    const high = insights.find((i) => i.category === "grade-level" && i.severity === "positive");
    expect(low?.courseId).toBe("weak");
    expect(high?.courseId).toBe("strong");
  });

  it("picks the single most notable declining trend across all courses/dimensions", () => {
    const mildDecline = classifyTrend([
      { at: "2026-07-01", value: 80 },
      { at: "2026-07-05", value: 79 },
      { at: "2026-07-10", value: 74 },
      { at: "2026-07-15", value: 73 },
    ]);
    const sharpDecline = classifyTrend([
      { at: "2026-07-01", value: 90 },
      { at: "2026-07-05", value: 88 },
      { at: "2026-07-10", value: 40 },
      { at: "2026-07-15", value: 38 },
    ]);
    const mild = courseProfile({
      course: course("mild", "Mild Decline"),
      attendance: attendanceMetrics({ trend: mildDecline }),
    });
    const sharp = courseProfile({
      course: course("sharp", "Sharp Decline"),
      grades: gradeMetrics({ trend: sharpDecline }),
    });
    const insights = generateInsights(
      semester({ attendance: attendanceMetrics({ attended: 1 }), courses: [mild, sharp] }),
    );
    const decline = insights.find((i) => i.category === "trend-decline");
    expect(decline?.courseId).toBe("sharp");
  });

  it("picks the single most notable improving trend across all courses/dimensions", () => {
    const mildImprove = classifyTrend([
      { at: "2026-07-01", value: 60 },
      { at: "2026-07-05", value: 61 },
      { at: "2026-07-10", value: 66 },
      { at: "2026-07-15", value: 67 },
    ]);
    const sharpImprove = classifyTrend([
      { at: "2026-07-01", value: 30 },
      { at: "2026-07-05", value: 32 },
      { at: "2026-07-10", value: 88 },
      { at: "2026-07-15", value: 90 },
    ]);
    const mild = courseProfile({
      course: course("mild", "Mild Improve"),
      practice: practiceMetrics({ trend: mildImprove }),
    });
    const sharp = courseProfile({
      course: course("sharp", "Sharp Improve"),
      attendance: attendanceMetrics({ trend: sharpImprove }),
    });
    const insights = generateInsights(
      semester({ attendance: attendanceMetrics({ attended: 1 }), courses: [mild, sharp] }),
    );
    const improve = insights.find((i) => i.category === "trend-improve");
    expect(improve?.courseId).toBe("sharp");
  });

  it("surfaces a consistency insight only once enough tasks exist and completion is very high", () => {
    const insights = generateInsights(
      semester({ tasks: taskMetrics({ totalRelevant: 8, completed: 8, completionRate: 100 }) }),
    );
    expect(insights.find((i) => i.category === "consistency")).toBeDefined();
  });

  it("does not surface consistency when there are too few tasks to be meaningful", () => {
    const insights = generateInsights(
      semester({ tasks: taskMetrics({ totalRelevant: 2, completed: 2, completionRate: 100 }) }),
    );
    expect(insights.find((i) => i.category === "consistency")).toBeUndefined();
  });

  it("surfaces insufficient-grade-history guidance only when grades exist but a trend can't be classified", () => {
    const insights = generateInsights(
      semester({ grades: gradeMetrics({ entryCount: 2, trend: NO_TREND }) }),
    );
    expect(insights.find((i) => i.category === "trend-data")).toBeDefined();
  });

  it("never emits more than one insight per rule category (no duplicate-fact flooding)", () => {
    const a = courseProfile({
      course: course("a", "A"),
      tasks: taskMetrics({ totalRelevant: 10, completed: 1, completionRate: 10 }),
    });
    const b = courseProfile({
      course: course("b", "B"),
      tasks: taskMetrics({ totalRelevant: 10, completed: 2, completionRate: 20 }),
    });
    const insights = generateInsights(
      semester({
        tasks: taskMetrics({ totalRelevant: 20, completed: 3, completionRate: 15 }),
        courses: [a, b],
      }),
    );
    const taskInsights = insights.filter((i) => i.category === "task-completion");
    expect(taskInsights).toHaveLength(1);
  });

  it("ranks attention insights above positive insights, and positive above info", () => {
    const weakGrades = courseProfile({
      course: course("weak", "Weak"),
      grades: gradeMetrics({
        entryCount: 3,
        performancePercent: 40,
        recordedEarned: 4,
        recordedMax: 10,
      }),
    });
    const strongGrades = courseProfile({
      course: course("strong", "Strong"),
      grades: gradeMetrics({
        entryCount: 3,
        performancePercent: 95,
        recordedEarned: 19,
        recordedMax: 20,
      }),
    });
    const insights = generateInsights(
      semester({
        tasks: taskMetrics({ totalRelevant: 10, completed: 8, completionRate: 80 }),
        courses: [weakGrades, strongGrades],
      }),
    );
    const severities = insights.map((i) => i.severity);
    const firstPositiveIndex = severities.indexOf("positive");
    const firstAttentionIndex = severities.indexOf("attention");
    if (firstPositiveIndex !== -1 && firstAttentionIndex !== -1) {
      expect(firstAttentionIndex).toBeLessThan(firstPositiveIndex);
    }
  });
});
