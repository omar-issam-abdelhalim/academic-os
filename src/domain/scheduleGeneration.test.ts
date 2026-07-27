import { describe, expect, it } from "vitest";
import {
  buildOccurrenceForDate,
  occurrenceKey,
  planOccurrences,
  toAppDayOfWeek,
  toIsoDate,
} from "./scheduleGeneration";
import type { ScheduleTemplate } from "@/types/entities";

function makeTemplate(overrides: Partial<ScheduleTemplate> = {}): ScheduleTemplate {
  return {
    id: "tmpl-1",
    courseId: "course-1",
    type: "Lecture",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:30",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toAppDayOfWeek", () => {
  it("maps JS Sunday(0)..Saturday(6) onto the app's Saturday(0)..Friday(6) week", () => {
    expect(toAppDayOfWeek(6)).toBe(0); // Saturday -> 0
    expect(toAppDayOfWeek(0)).toBe(1); // Sunday -> 1
    expect(toAppDayOfWeek(5)).toBe(6); // Friday -> 6
  });
});

describe("buildOccurrenceForDate", () => {
  it("copies a denormalized snapshot from the template, unmarked by default", () => {
    const template = makeTemplate({ location: "Room C201" });
    const occurrence = buildOccurrenceForDate(template, new Date(2026, 6, 4)); // Saturday
    expect(occurrence).toMatchObject({
      scheduleTemplateId: "tmpl-1",
      date: "2026-07-04",
      status: "unmarked",
      courseId: "course-1",
      type: "Lecture",
      startTime: "09:00",
      endTime: "10:30",
      location: "Room C201",
    });
  });
});

describe("planOccurrences", () => {
  it("plans one occurrence per matching (template, date) pair not already existing", () => {
    const template = makeTemplate({ dayOfWeek: 0 }); // Saturday
    const saturday = new Date(2026, 6, 4);
    const sunday = new Date(2026, 6, 5);
    const planned = planOccurrences([template], [saturday, sunday], new Set());
    expect(planned).toHaveLength(1);
    expect(planned[0]?.date).toBe("2026-07-04");
  });

  it("never plans an occurrence that already exists (idempotent)", () => {
    const template = makeTemplate({ dayOfWeek: 0 });
    const saturday = new Date(2026, 6, 4);
    const existing = new Set([occurrenceKey(template.id, toIsoDate(saturday))]);
    const planned = planOccurrences([template], [saturday], existing);
    expect(planned).toHaveLength(0);
  });

  it("never plans for an inactive (paused) template", () => {
    const template = makeTemplate({ dayOfWeek: 0, active: false });
    const planned = planOccurrences([template], [new Date(2026, 6, 4)], new Set());
    expect(planned).toHaveLength(0);
  });

  it("never plans for a day of week the template doesn't match", () => {
    const template = makeTemplate({ dayOfWeek: 0 }); // Saturday only
    const planned = planOccurrences([template], [new Date(2026, 6, 5)], new Set()); // Sunday
    expect(planned).toHaveLength(0);
  });
});
