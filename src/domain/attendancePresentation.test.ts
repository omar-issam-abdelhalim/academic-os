import { describe, expect, it } from "vitest";
import {
  getAttendancePresentationState,
  canMarkAttendance,
  type OccurrenceTiming,
} from "./attendancePresentation";

const base: OccurrenceTiming = {
  status: "unmarked",
  start: new Date(2026, 6, 25, 9, 0),
  end: new Date(2026, 6, 25, 10, 30),
};

describe("getAttendancePresentationState", () => {
  it("is 'upcoming' before the start time, with no attendance-marking allowed", () => {
    const now = new Date(2026, 6, 25, 8, 0);
    const state = getAttendancePresentationState(base, now);
    expect(state).toBe("upcoming");
    expect(canMarkAttendance(state)).toBe(false);
  });

  it("is 'in-progress' between start and end, with attendance-marking allowed", () => {
    const now = new Date(2026, 6, 25, 9, 30);
    const state = getAttendancePresentationState(base, now);
    expect(state).toBe("in-progress");
    expect(canMarkAttendance(state)).toBe(true);
  });

  it("is 'not-recorded' — never 'missed' — after end time with no recorded status", () => {
    const now = new Date(2026, 6, 25, 11, 0);
    const state = getAttendancePresentationState(base, now);
    expect(state).toBe("not-recorded");
    expect(state).not.toBe("missed");
    expect(canMarkAttendance(state)).toBe(true);
  });

  it("reflects a recorded status regardless of elapsed time", () => {
    const attended: OccurrenceTiming = { ...base, status: "attended" };
    expect(getAttendancePresentationState(attended, new Date(2026, 6, 25, 8, 0))).toBe("attended");
    expect(getAttendancePresentationState(attended, new Date(2026, 6, 25, 12, 0))).toBe("attended");
  });

  it("never conflates 'not-recorded' and 'missed' at the exact end-time boundary", () => {
    const atEnd = getAttendancePresentationState(base, base.end);
    const missed = getAttendancePresentationState({ ...base, status: "missed" }, base.end);
    expect(atEnd).toBe("not-recorded");
    expect(missed).toBe("missed");
    expect(atEnd).not.toBe(missed);
  });
});
