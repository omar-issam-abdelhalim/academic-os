import { describe, expect, it } from "vitest";
import { computeAttendanceMetrics, computeAttendanceMetricsByCourse } from "./attendanceAnalytics";
import type { ScheduleOccurrence } from "@/types/entities";

function makeOccurrence(overrides: Partial<ScheduleOccurrence> = {}): ScheduleOccurrence {
  return {
    id: "o1",
    scheduleTemplateId: "tmpl-1",
    date: "2026-07-04",
    status: "unmarked",
    courseId: "course-1",
    type: "Lecture",
    startTime: "09:00",
    endTime: "10:00",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("computeAttendanceMetrics", () => {
  it("reports undefined attendance rate when nothing is recorded", () => {
    const metrics = computeAttendanceMetrics([]);
    expect(metrics.attendanceRate).toBeUndefined();
  });

  it("excludes cancelled and unmarked occurrences from the rate denominator", () => {
    const occurrences = [
      makeOccurrence({ id: "1", status: "attended" }),
      makeOccurrence({ id: "2", status: "missed" }),
      makeOccurrence({ id: "3", status: "cancelled" }),
      makeOccurrence({ id: "4", status: "unmarked" }),
    ];
    const metrics = computeAttendanceMetrics(occurrences);
    // 1 attended / (1 attended + 1 missed) = 50%, cancelled/unmarked excluded.
    expect(metrics.attendanceRate).toBe(50);
    expect(metrics.cancelled).toBe(1);
    expect(metrics.unmarked).toBe(1);
  });

  it("never lets a cancelled-heavy week count negatively toward the rate", () => {
    const occurrences = [
      makeOccurrence({ id: "1", status: "attended" }),
      makeOccurrence({ id: "2", status: "cancelled" }),
      makeOccurrence({ id: "3", status: "cancelled" }),
      makeOccurrence({ id: "4", status: "cancelled" }),
    ];
    expect(computeAttendanceMetrics(occurrences).attendanceRate).toBe(100);
  });

  it("scopes metrics to a single course", () => {
    const occurrences = [
      makeOccurrence({ id: "1", courseId: "course-1", status: "attended" }),
      makeOccurrence({ id: "2", courseId: "course-2", status: "missed" }),
    ];
    const metrics = computeAttendanceMetricsByCourse(occurrences, "course-1");
    expect(metrics.attendanceRate).toBe(100);
  });

  it("buckets attended/missed occurrences into weekly rate points for the trend", () => {
    const occurrences = [
      makeOccurrence({ id: "1", date: "2026-07-04", status: "attended" }), // week of Jul 4 (Sat)
      makeOccurrence({ id: "2", date: "2026-07-11", status: "missed" }), // next week
    ];
    const metrics = computeAttendanceMetrics(occurrences);
    expect(metrics.weeklyRates).toHaveLength(2);
    expect(metrics.weeklyRates[0]!.value).toBe(100);
    expect(metrics.weeklyRates[1]!.value).toBe(0);
  });
});
