import { cn } from "@/lib/classNames";
import { DAY_LABELS } from "@/domain/academicWeek";
import { courseById } from "@/fixtures";
import type { ScheduleOccurrence } from "@/types/entities";
import styles from "./WeekOverview.module.css";

export interface WeekOverviewProps {
  days: Date[];
  occurrencesByDay: Map<string, ScheduleOccurrence[]>;
  onSelectDay: (isoDate: string) => void;
  todayIso: string;
}

/**
 * Mobile's default landing view — the "shape" of the whole week at a
 * glance, not a shrunk desktop grid (STAGE_1A_UX_ARCHITECTURE.md §K,
 * Revision A). Today is visually emphasized.
 */
export function WeekOverview({ days, occurrencesByDay, onSelectDay, todayIso }: WeekOverviewProps) {
  return (
    <ul className={styles.list}>
      {days.map((day, i) => {
        const iso = day.toISOString().slice(0, 10);
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
                      {courseById(o.courseId)?.code ?? courseById(o.courseId)?.name} · {o.type}
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
