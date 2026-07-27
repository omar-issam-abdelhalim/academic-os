import { useState } from "react";
import { MapPin } from "lucide-react";
import { DAY_LABELS } from "@/domain/academicWeek";
import { occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import { getAttendancePresentationState } from "@/domain/attendancePresentation";
import { toIsoDate } from "@/domain/scheduleGeneration";
import type { Course, ScheduleOccurrence, ScheduleOccurrenceStatus } from "@/types/entities";
import { AttendanceControl } from "@/features/shared/AttendanceControl";
import { Dialog } from "@/components";
import { cn } from "@/lib/classNames";
import styles from "./WeekGrid.module.css";

export interface WeekGridProps {
  days: Date[];
  occurrencesByDay: Map<string, ScheduleOccurrence[]>;
  todayIso: string;
  courseById: Map<string, Course>;
  onMarkAttendance: (id: string, status: ScheduleOccurrenceStatus) => void;
}

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
const HOUR_HEIGHT = 56;

const STATE_TONE_CLASS: Record<string, string> = {
  attended: "toneSuccess",
  missed: "toneDanger",
  cancelled: "toneNeutral",
  "not-recorded": "toneWarning",
  "in-progress": "toneInfo",
  upcoming: "",
};

/**
 * Desktop's full Saturday→Friday grid, all seven days at once
 * (STAGE_1A_UX_ARCHITECTURE.md §D/§K) — not a scaled mobile view.
 *
 * Grid cells only have room for course/type + a compact status indicator
 * (a 1-hour class at any reasonable per-hour scale can't also fit the
 * full three-button attendance control without clipping); clicking an
 * event opens a detail dialog with the real, interactive
 * AttendanceControl — the same "compact overview, tap for detail" split
 * Day Detail already uses on mobile.
 */
export function WeekGrid({
  days,
  occurrencesByDay,
  todayIso,
  courseById,
  onMarkAttendance,
}: WeekGridProps) {
  const [selected, setSelected] = useState<ScheduleOccurrence | null>(null);
  const all = Array.from(occurrencesByDay.values()).flat();
  const startHour = Math.min(
    DEFAULT_START_HOUR,
    ...all.map((o) => occurrenceDateTimes(o).start.getHours()),
  );
  const endHour = Math.max(
    DEFAULT_END_HOUR,
    ...all.map((o) => Math.ceil(occurrenceDateTimes(o).end.getHours() + 0.001)),
  );
  const totalHours = endHour - startHour;
  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  function positionFor(occurrence: ScheduleOccurrence) {
    const { start, end } = occurrenceDateTimes(occurrence);
    const startFraction = (start.getHours() + start.getMinutes() / 60 - startHour) / totalHours;
    const endFraction = (end.getHours() + end.getMinutes() / 60 - startHour) / totalHours;
    return {
      top: `${startFraction * 100}%`,
      height: `${Math.max(endFraction - startFraction, 0.02) * 100}%`,
    };
  }

  const selectedCourse = selected ? courseById.get(selected.courseId) : undefined;

  return (
    <div className={styles.grid}>
      <div className={styles.hourColumn}>
        <div className={styles.headerSpacer} />
        {hours.map((h) => (
          <div key={h} className={styles.hourLabel} style={{ height: HOUR_HEIGHT }}>
            {h}:00
          </div>
        ))}
      </div>
      {days.map((day, i) => {
        const iso = toIsoDate(day);
        const isToday = iso === todayIso;
        const dayOccurrences = occurrencesByDay.get(iso) ?? [];
        return (
          <div key={iso} className={cn(styles.dayColumn, isToday && styles.today)}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{DAY_LABELS[i]}</span>
              <span className={styles.dayNumber}>{day.getDate()}</span>
            </div>
            <div className={styles.track} style={{ height: `${totalHours * HOUR_HEIGHT}px` }}>
              {hours.map((h) => (
                <div key={h} className={styles.hourLine} style={{ height: HOUR_HEIGHT }} />
              ))}
              {dayOccurrences.map((occurrence) => {
                const { start, end } = occurrenceDateTimes(occurrence);
                const state = getAttendancePresentationState({
                  status: occurrence.status,
                  start,
                  end,
                });
                const toneClass = STATE_TONE_CLASS[state];
                return (
                  <button
                    key={occurrence.id}
                    type="button"
                    className={cn(styles.event, toneClass && styles[toneClass])}
                    style={positionFor(occurrence)}
                    onClick={() => setSelected(occurrence)}
                  >
                    <p className={styles.eventTitle}>
                      {courseById.get(occurrence.courseId)?.code ??
                        courseById.get(occurrence.courseId)?.name}
                    </p>
                    <p className={styles.eventType}>{occurrence.type}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selectedCourse?.name ?? ""} — ${selected.type}` : ""}
      >
        {selected && (
          <div className={styles.detail}>
            <p className={styles.detailTime}>
              <span className="numeric">{selected.startTime}</span>
              {" – "}
              <span className="numeric">{selected.endTime}</span>
            </p>
            {selected.location && (
              <p className={styles.detailLocation}>
                <MapPin size={14} strokeWidth={1.5} aria-hidden="true" /> {selected.location}
              </p>
            )}
            <div className={styles.detailControl}>
              <AttendanceControl
                occurrence={selected}
                onMark={(status) => {
                  onMarkAttendance(selected.id, status);
                  setSelected({ ...selected, status });
                }}
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
