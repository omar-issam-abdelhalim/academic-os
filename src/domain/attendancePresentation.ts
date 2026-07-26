/**
 * Derives the presentation-layer attendance state for a schedule occurrence.
 *
 * STAGE_1A_UX_ARCHITECTURE.md §K (Revision B): DATA_MODEL.md's
 * `ScheduleOccurrence.status` stays exactly
 * "attended" | "missed" | "cancelled" | "unmarked" — unchanged. What's new
 * here is purely a *presentation* derivation for an `unmarked` occurrence,
 * comparing now to the occurrence's start/end time. This function performs
 * that derivation and must be the only place it happens, so Home, the
 * Schedule Day Detail, the desktop grid, and Course Detail's Schedule tab
 * can never disagree about what state a given occurrence is in.
 *
 * Critically: "Attendance not recorded" must never be computed or styled
 * as equivalent to "Missed" — the app never infers Missed from elapsed
 * time alone (PRODUCT_SPEC.md §8 / Cross-Cutting Invariant #6 context).
 */

export type OccurrenceStatus = "attended" | "missed" | "cancelled" | "unmarked";

export type AttendancePresentationState =
  "upcoming" | "in-progress" | "not-recorded" | "attended" | "missed" | "cancelled";

export interface OccurrenceTiming {
  status: OccurrenceStatus;
  start: Date;
  end: Date;
}

/** True only for states where the three-option control should be offered. */
export function canMarkAttendance(state: AttendancePresentationState): boolean {
  return state !== "upcoming";
}

export function getAttendancePresentationState(
  occurrence: OccurrenceTiming,
  now: Date = new Date(),
): AttendancePresentationState {
  if (occurrence.status !== "unmarked") {
    return occurrence.status;
  }
  if (now < occurrence.start) return "upcoming";
  if (now < occurrence.end) return "in-progress";
  return "not-recorded";
}

export const ATTENDANCE_PRESENTATION_LABEL: Record<AttendancePresentationState, string> = {
  upcoming: "Upcoming",
  "in-progress": "In progress",
  "not-recorded": "Attendance not recorded",
  attended: "Attended",
  missed: "Missed",
  cancelled: "Cancelled",
};
