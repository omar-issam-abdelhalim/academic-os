import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { preferencesDb, semesterDb } from "@/data/db";
import { updatePreferences } from "@/data/repositories/preferencesRepository";
import { createSemester } from "@/data/repositories/semesterRepository";
import { createCourse } from "@/data/repositories/courseRepository";
import { createTemplate } from "@/data/repositories/scheduleRepository";
import { toAppDayOfWeek } from "@/domain/scheduleGeneration";
import { useClassReminders } from "./useClassReminders";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
  await preferencesDb.delete();
  await preferencesDb.open();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function timeLabel(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ReminderProbe() {
  const { activeReminder, dismiss } = useClassReminders();
  return (
    <div>
      <div data-testid="reminder">{activeReminder?.message ?? "none"}</div>
      <button onClick={dismiss}>Dismiss</button>
    </div>
  );
}

async function seedCourseWithClassStartingSoon(minutesFromNow: number, minutesLong = 60) {
  await createSemester({ academicYear: "Year 2", label: "Semester 1" });
  const course = await createCourse({ name: "CSAI 101" });
  const now = new Date();
  const start = new Date(now.getTime() + minutesFromNow * 60_000);
  const end = new Date(start.getTime() + minutesLong * 60_000);
  await createTemplate({
    courseId: course.id,
    type: "Lecture",
    dayOfWeek: toAppDayOfWeek(now.getDay()),
    startTime: timeLabel(start),
    endTime: timeLabel(end),
    location: "Room C201",
  });
  return course;
}

describe("useClassReminders — Tier 1 (in-app banner)", () => {
  it("shows nothing when notifications are disabled", async () => {
    await seedCourseWithClassStartingSoon(5);
    await updatePreferences({ notificationsEnabled: false });

    render(<ReminderProbe />);
    await waitFor(() => expect(screen.getByTestId("reminder")).toHaveTextContent("none"));
  });

  it("surfaces a reminder for a class starting within the lead window", async () => {
    await seedCourseWithClassStartingSoon(5);
    await updatePreferences({ notificationsEnabled: true });

    render(<ReminderProbe />);
    await waitFor(
      () => expect(screen.getByTestId("reminder")).toHaveTextContent(/CSAI 101 — Lecture/),
      { timeout: 3000 },
    );
    expect(screen.getByTestId("reminder")).toHaveTextContent("Room C201");
  });

  it("shows nothing for a class further out than the lead window", async () => {
    await seedCourseWithClassStartingSoon(120);
    await updatePreferences({ notificationsEnabled: true });

    render(<ReminderProbe />);
    await waitFor(() => expect(screen.getByTestId("reminder")).toHaveTextContent("none"));
  });

  it("dismissing the active reminder clears it", async () => {
    await seedCourseWithClassStartingSoon(5);
    await updatePreferences({ notificationsEnabled: true });

    render(<ReminderProbe />);
    await waitFor(() =>
      expect(screen.getByTestId("reminder")).toHaveTextContent(/CSAI 101 — Lecture/),
    );

    fireEvent.click(screen.getByText("Dismiss"));
    await waitFor(() => expect(screen.getByTestId("reminder")).toHaveTextContent("none"));
  });
});

describe("useClassReminders — Tier 2 (best-effort Notification scheduling)", () => {
  // Real timers throughout (Dexie/dexie-react-hooks schedule their own
  // internal continuations, which fake timers can deadlock) — instead of
  // waiting for a multi-minute real timer to fire, this asserts on *what
  // gets scheduled*: a setTimeout with a delay matching the documented
  // lead time, filtered away from React/testing-library's own much-shorter
  // internal timers by requiring a multi-minute delay.
  function delaysScheduledInMinutesRange(calls: unknown[][]): number[] {
    return calls
      .map((call) => call[1] as number | undefined)
      .filter((delay): delay is number => typeof delay === "number" && delay > 20_000);
  }

  it("schedules a Tier 2 timer for the documented lead time when permission is already granted", async () => {
    // Just outside Tier 1's lead window so this exercises Tier 2's own
    // up-front scheduling, not the Tier 1 banner discovery path.
    await seedCourseWithClassStartingSoon(30);
    await updatePreferences({ notificationsEnabled: true });

    Object.defineProperty(globalThis, "Notification", {
      value: Object.assign(vi.fn(), { permission: "granted" }),
      configurable: true,
      writable: true,
    });
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    render(<ReminderProbe />);

    await waitFor(
      () => {
        const longDelays = delaysScheduledInMinutesRange(setTimeoutSpy.mock.calls);
        expect(longDelays.length).toBeGreaterThan(0);
        // ~20 minutes early (30 min out minus the 10-minute lead) — a wide
        // tolerance band, since this only needs to distinguish "a real Tier
        // 2 timer was scheduled" from React/testing-library's own
        // much-shorter internal timers, not assert an exact value.
        expect(longDelays[0]).toBeGreaterThan(10 * 60_000);
        expect(longDelays[0]).toBeLessThan(25 * 60_000);
      },
      { timeout: 8000, interval: 100 },
    );
  });

  it("never schedules a Tier 2 timer when permission has not been granted", async () => {
    await seedCourseWithClassStartingSoon(30);
    await updatePreferences({ notificationsEnabled: true });

    Object.defineProperty(globalThis, "Notification", {
      value: Object.assign(vi.fn(), { permission: "denied" }),
      configurable: true,
      writable: true,
    });
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    render(<ReminderProbe />);

    // Give every effect/liveQuery a chance to settle, then confirm no
    // long-delay (Tier 2 style) timer was ever scheduled.
    await waitFor(() => expect(screen.getByTestId("reminder")).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(delaysScheduledInMinutesRange(setTimeoutSpy.mock.calls)).toHaveLength(0);
  });
});
