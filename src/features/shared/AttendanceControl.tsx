import { useState } from "react";
import { Check, X, CalendarOff, Clock, Pencil } from "lucide-react";
import {
  canMarkAttendance,
  getAttendancePresentationState,
  ATTENDANCE_PRESENTATION_LABEL,
} from "@/domain/attendancePresentation";
import { occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import { StatusBadge } from "@/components";
import { cn } from "@/lib/classNames";
import type { ScheduleOccurrence, ScheduleOccurrenceStatus } from "@/types/entities";
import styles from "./AttendanceControl.module.css";

export interface AttendanceControlProps {
  occurrence: ScheduleOccurrence;
  onMark: (status: ScheduleOccurrenceStatus) => void;
  now?: Date;
}

/**
 * The one attendance UI, reused on Home, Schedule Day Detail, the desktop
 * grid, and Course Detail's Schedule tab (STAGE_1A_UX_ARCHITECTURE.md §K).
 * "Attendance not recorded" is rendered with its own neutral tone — it
 * must never be visually confusable with "Missed" (Cross-Cutting
 * Invariant #6 context / §U: no color-only status, and specifically no
 * conflation of these two states).
 */
export function AttendanceControl({
  occurrence,
  onMark,
  now = new Date(),
}: AttendanceControlProps) {
  const [correcting, setCorrecting] = useState(false);
  const { start, end } = occurrenceDateTimes(occurrence);
  const state = getAttendancePresentationState({ status: occurrence.status, start, end }, now);
  const label = ATTENDANCE_PRESENTATION_LABEL[state];

  if (state === "upcoming") {
    return (
      <StatusBadge tone="neutral" icon={<Clock size={13} strokeWidth={1.5} aria-hidden="true" />}>
        {label}
      </StatusBadge>
    );
  }

  // Already-recorded states (attended/missed/cancelled) are settled — the
  // three-option control is available to *correct* them
  // (STAGE_1A_UX_ARCHITECTURE.md §K: "tapping it reopens the same
  // control"), but stays collapsed behind the badge until asked for, so a
  // grid full of settled classes doesn't force every cell to reserve
  // space for buttons nobody needs right now. States that actually need
  // action *now* (in-progress, not-recorded) show the buttons immediately.
  const isSettled = state === "attended" || state === "missed" || state === "cancelled";
  const showActions = canMarkAttendance(state) && (!isSettled || correcting);

  const recordedTone =
    state === "attended"
      ? "success"
      : state === "missed"
        ? "danger"
        : state === "cancelled"
          ? "neutral"
          : "warning";

  return (
    <div className={styles.control}>
      {isSettled ? (
        <button
          type="button"
          className={styles.correctTrigger}
          onClick={() => setCorrecting((c) => !c)}
          aria-expanded={correcting}
        >
          <StatusBadge tone={recordedTone}>{label}</StatusBadge>
          <Pencil size={11} strokeWidth={1.5} aria-hidden="true" />
          <span className="visually-hidden">Correct attendance</span>
        </button>
      ) : (
        <StatusBadge tone={recordedTone}>{label}</StatusBadge>
      )}
      {showActions && (
        <div className={styles.actions} role="group" aria-label="Mark attendance">
          <button
            type="button"
            className={cn(styles.action, styles.attend)}
            aria-pressed={state === "attended"}
            onClick={() => {
              onMark("attended");
              setCorrecting(false);
            }}
          >
            <Check size={14} strokeWidth={2} aria-hidden="true" /> Attended
          </button>
          <button
            type="button"
            className={cn(styles.action, styles.miss)}
            aria-pressed={state === "missed"}
            onClick={() => {
              onMark("missed");
              setCorrecting(false);
            }}
          >
            <X size={14} strokeWidth={2} aria-hidden="true" /> Missed
          </button>
          <button
            type="button"
            className={cn(styles.action, styles.cancel)}
            aria-pressed={state === "cancelled"}
            onClick={() => {
              onMark("cancelled");
              setCorrecting(false);
            }}
          >
            <CalendarOff size={14} strokeWidth={2} aria-hidden="true" /> Cancelled
          </button>
        </div>
      )}
    </div>
  );
}
