import { describe, expect, it } from "vitest";
import {
  REMINDER_LEAD_MINUTES,
  findTodaysFutureOccurrences,
  findUpcomingReminders,
  formatReminderMessage,
  reminderFireTime,
} from "./notifications";
import { toIsoDate } from "@/domain/scheduleGeneration";
import type { ScheduleOccurrence } from "@/types/entities";

const NOW = new Date(2026, 6, 27, 8, 50); // 08:50 local
const TODAY_ISO = toIsoDate(NOW);

function occurrence(overrides: Partial<ScheduleOccurrence> = {}): ScheduleOccurrence {
  return {
    id: "occ-1",
    scheduleTemplateId: "tmpl-1",
    date: TODAY_ISO,
    status: "unmarked",
    courseId: "course-1",
    type: "Lecture",
    startTime: "09:00",
    endTime: "10:30",
    location: "Room C201",
    createdAt: "x",
    updatedAt: "x",
    ...overrides,
  };
}

describe("findUpcomingReminders", () => {
  it("includes a class starting within the lead window", () => {
    const reminders = findUpcomingReminders([occurrence()], NOW);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.occurrence.id).toBe("occ-1");
    expect(reminders[0]?.minutesUntilStart).toBe(10);
  });

  it("excludes a class starting further out than the lead window", () => {
    const reminders = findUpcomingReminders(
      [occurrence({ startTime: "11:00", endTime: "12:00" })],
      NOW,
    );
    expect(reminders).toHaveLength(0);
  });

  it("excludes a class that has already started", () => {
    const reminders = findUpcomingReminders(
      [occurrence({ startTime: "08:00", endTime: "09:00" })],
      NOW,
    );
    expect(reminders).toHaveLength(0);
  });

  it("excludes cancelled occurrences — nothing to remind about", () => {
    const reminders = findUpcomingReminders([occurrence({ status: "cancelled" })], NOW);
    expect(reminders).toHaveLength(0);
  });

  it("excludes occurrences on a different day", () => {
    const reminders = findUpcomingReminders([occurrence({ date: "2020-01-01" })], NOW);
    expect(reminders).toHaveLength(0);
  });

  it("sorts multiple qualifying reminders soonest-first", () => {
    const later = occurrence({ id: "occ-later", startTime: "08:58", endTime: "09:30" });
    const sooner = occurrence({ id: "occ-sooner", startTime: "08:55", endTime: "09:20" });
    const reminders = findUpcomingReminders([later, sooner], NOW);
    expect(reminders.map((r) => r.occurrence.id)).toEqual(["occ-sooner", "occ-later"]);
  });

  it("respects a custom lead time", () => {
    const reminders = findUpcomingReminders(
      [occurrence({ startTime: "09:03", endTime: "10:00" })],
      NOW,
      5,
    );
    expect(reminders).toHaveLength(0);
    const wider = findUpcomingReminders(
      [occurrence({ startTime: "09:03", endTime: "10:00" })],
      NOW,
      15,
    );
    expect(wider).toHaveLength(1);
  });
});

describe("findTodaysFutureOccurrences", () => {
  it("includes every still-future, non-cancelled class today regardless of lead window", () => {
    const far = occurrence({ id: "far", startTime: "18:00", endTime: "19:00" });
    const result = findTodaysFutureOccurrences([far], NOW);
    expect(result.map((o) => o.id)).toEqual(["far"]);
  });

  it("excludes past and cancelled occurrences", () => {
    const past = occurrence({ id: "past", startTime: "07:00", endTime: "08:00" });
    const cancelled = occurrence({ id: "cancelled", status: "cancelled", startTime: "18:00" });
    const result = findTodaysFutureOccurrences([past, cancelled], NOW);
    expect(result).toHaveLength(0);
  });
});

describe("reminderFireTime", () => {
  it("fires REMINDER_LEAD_MINUTES before the occurrence start by default", () => {
    const o = occurrence({ startTime: "09:00", endTime: "10:00" });
    const fireTime = reminderFireTime(o);
    const startTime = new Date(2026, 6, 27, 9, 0).getTime();
    expect(fireTime).toBe(startTime - REMINDER_LEAD_MINUTES * 60 * 1000);
  });
});

describe("formatReminderMessage", () => {
  it("matches PRODUCT_SPEC.md §9's example format: Course — Type — Starts at HH:MM — Location", () => {
    const reminders = findUpcomingReminders([occurrence()], NOW);
    const message = formatReminderMessage(reminders[0]!, "CSAI 101");
    expect(message).toMatch(/^CSAI 101 — Lecture — Starts at .+ — Room C201$/);
  });

  it("omits the location segment when there is none", () => {
    const reminders = findUpcomingReminders([occurrence({ location: undefined })], NOW);
    const message = formatReminderMessage(reminders[0]!, "CSAI 101");
    expect(message).toMatch(/^CSAI 101 — Lecture — Starts at [^—]+$/);
  });
});
