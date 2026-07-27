import { cn } from "@/lib/classNames";
import { DAY_LABELS } from "@/domain/academicWeek";
import { toIsoDate } from "@/domain/scheduleGeneration";
import type { Course, ScheduleOccurrence } from "@/types/entities";
import styles from "./WeekOverview.module.css";

export interface WeekOverviewProps {
  days: Date[];
  occurrencesByDay: Map<string, ScheduleOccurrence[]>;
  courseById: Map<string, Course>;
  onSelectDay: (isoDate: string) => void;
  todayIso: string;
}

/**
 * Mobile's default landing view — the "shape" of the whole week at a
 * glance, not a shrunk desktop grid (STAGE_1A_UX_ARCHITECTURE.md §K,
 * Revision A). Today is visually emphasized.
 */
export function WeekOverview({
  days,
  occurrencesByDay,
  courseById,
  onSelectDay,
  todayIso,
}: WeekOverviewProps) {
  return (
    <ul className={styles.list}>
      {days.map((day, i) => {
        const iso = toIsoDate(day);
        const isToday = iso === todayIso;
        const dayOccurrences = occurrencesByDay.get(iso) ?? [];
        return (
          <li key={iso}>
            <button
              type="button"
              className={cn(styles.dayRow, isToday && styles.today)}
              onClick={() => onSelectDay(iso)}
            >
              <span className={styles.dayLabel}>
                <span className={styles.dayName}>{DAY_LABELS[i]}</span>
                <span className={styles.dayNumber}>{day.getDate()}</span>
              </span>
              <span className={styles.chips}>
                {dayOccurrences.length === 0 ? (
                  <span className={styles.none}>No classes</span>
                ) : (
                  dayOccurrences.map((o) => (
                    <span key={o.id} className={styles.chip}>
                      {courseById.get(o.courseId)?.code ?? courseById.get(o.courseId)?.name} ·{" "}
                      {o.type}
                    </span>
                  ))
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
