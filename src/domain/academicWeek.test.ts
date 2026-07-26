import { describe, expect, it } from "vitest";
import {
  getAcademicWeek,
  isSameAcademicWeek,
  addAcademicWeeks,
  bucketForDate,
  formatWeekRange,
  academicWeekDays,
  DAY_LABELS,
} from "./academicWeek";

describe("getAcademicWeek", () => {
  it("returns Saturday 00:00:00.000 as the start, for a date that is itself a Saturday", () => {
    const saturday = new Date(2026, 6, 25); // 2026-07-25 is a Saturday
    const week = getAcademicWeek(saturday);
    expect(week.start.getDay()).toBe(6);
    expect(week.start.getHours()).toBe(0);
    expect(week.start.getMinutes()).toBe(0);
    expect(week.start.getSeconds()).toBe(0);
    expect(week.start.getMilliseconds()).toBe(0);
  });

  it("returns Friday 23:59:59.999 as the end", () => {
    const wednesday = new Date(2026, 6, 29); // 2026-07-29 is a Wednesday
    const week = getAcademicWeek(wednesday);
    expect(week.end.getDay()).toBe(5);
    expect(week.end.getHours()).toBe(23);
    expect(week.end.getMinutes()).toBe(59);
    expect(week.end.getSeconds()).toBe(59);
    expect(week.end.getMilliseconds()).toBe(999);
  });

  it("puts a Friday in the same week as the preceding Saturday", () => {
    const saturday = new Date(2026, 6, 25);
    const friday = new Date(2026, 6, 31);
    expect(getAcademicWeek(saturday).start.getTime()).toBe(getAcademicWeek(friday).start.getTime());
  });

  it("puts a Sunday in the same week as the preceding Saturday, not the following one", () => {
    const saturday = new Date(2026, 6, 25);
    const sunday = new Date(2026, 6, 26);
    expect(getAcademicWeek(sunday).start.getTime()).toBe(getAcademicWeek(saturday).start.getTime());
  });

  it("spans exactly one millisecond short of 7 full days (Sat 00:00:00.000 to Fri 23:59:59.999)", () => {
    const week = getAcademicWeek(new Date(2026, 6, 29));
    const spanMs = week.end.getTime() - week.start.getTime();
    expect(spanMs).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });
});

describe("isSameAcademicWeek", () => {
  it("is true for two dates within the same Sat–Fri week", () => {
    expect(isSameAcademicWeek(new Date(2026, 6, 25), new Date(2026, 6, 31))).toBe(true);
  });

  it("is false across a week boundary (Friday vs. the next Saturday)", () => {
    expect(isSameAcademicWeek(new Date(2026, 6, 31), new Date(2026, 7, 1))).toBe(false);
  });
});

describe("addAcademicWeeks", () => {
  it("shifts by exactly 7 days per week, preserving time-of-day", () => {
    const start = new Date(2026, 6, 25, 9, 30);
    const shifted = addAcademicWeeks(start, 2);
    expect(shifted.getTime() - start.getTime()).toBe(14 * 24 * 60 * 60 * 1000);
    expect(shifted.getHours()).toBe(9);
    expect(shifted.getMinutes()).toBe(30);
  });
});

describe("bucketForDate", () => {
  const now = new Date(2026, 6, 29, 12, 0); // Wednesday noon

  it("buckets a past day as overdue", () => {
    expect(bucketForDate(new Date(2026, 6, 27), now)).toBe("overdue");
  });

  it("buckets the current day as today, regardless of time-of-day", () => {
    expect(bucketForDate(new Date(2026, 6, 29, 23, 0), now)).toBe("today");
  });

  it("buckets a future day as upcoming", () => {
    expect(bucketForDate(new Date(2026, 6, 30), now)).toBe("upcoming");
  });
});

describe("academicWeekDays / DAY_LABELS", () => {
  it("returns 7 days starting Saturday and matching DAY_LABELS order", () => {
    const days = academicWeekDays(new Date(2026, 6, 29));
    expect(days).toHaveLength(7);
    expect(DAY_LABELS).toHaveLength(7);
    days.forEach((day, i) => {
      const expectedDay = (6 + i) % 7; // 6=Sat, 0=Sun, ... 5=Fri
      expect(day.getDay()).toBe(expectedDay);
    });
  });
});

describe("formatWeekRange", () => {
  it("formats a same-month range compactly", () => {
    const week = getAcademicWeek(new Date(2026, 6, 29));
    expect(formatWeekRange(week)).toMatch(/^Jul 25–31$/);
  });
});
