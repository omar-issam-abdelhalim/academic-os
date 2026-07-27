import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { IconButton, EmptyState } from "@/components";
import { AttendanceControl } from "@/features/shared/AttendanceControl";
import { occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import type { Course, ScheduleOccurrence, ScheduleOccurrenceStatus } from "@/types/entities";
import styles from "./DayDetail.module.css";

export interface DayDetailProps {
  date: Date;
  occurrences: ScheduleOccurrence[];
  courseById: Map<string, Course>;
  onBack: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onMarkAttendance: (id: string, status: ScheduleOccurrenceStatus) => void;
}

/** A chronological single-day agenda, reached by drilling into the Week
 * Overview (STAGE_1A_UX_ARCHITECTURE.md §K). Day-to-day arrows are a
 * convenience; the Week Overview remains the primary navigation anchor. */
export function DayDetail({
  date,
  occurrences,
  courseById,
  onBack,
  onPrevDay,
  onNextDay,
  onMarkAttendance,
}: DayDetailProps) {
  const sorted = [...occurrences].sort(
    (a, b) => occurrenceDateTimes(a).start.getTime() - occurrenceDateTimes(b).start.getTime(),
  );

  return (
    <div>
      <div className={styles.dayNav}>
        <button type="button" className={styles.backLink} onClick={onBack}>
          ← Week
        </button>
        <div className={styles.dayNavControls}>
          <IconButton aria-label="Previous day" size="small" onClick={onPrevDay}>
            <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
          <span className={styles.dayHeading}>
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </span>
          <IconButton aria-label="Next day" size="small" onClick={onNextDay}>
            <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState title="No classes scheduled" />
      ) : (
        <ul className={styles.list}>
          {sorted.map((occurrence) => {
            const course = courseById.get(occurrence.courseId);
            return (
              <li key={occurrence.id} className={styles.item}>
                <div className={styles.time}>
                  <span className="numeric">{occurrence.startTime}</span>
                  <span className={styles.timeDash} aria-hidden="true" />
                  <span className="numeric">{occurrence.endTime}</span>
                </div>
                <div className={styles.details}>
                  <p className={styles.courseName}>
                    {course?.name} — {occurrence.type}
                  </p>
                  {occurrence.location && (
                    <p className={styles.location}>
                      <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />{" "}
                      {occurrence.location}
                    </p>
                  )}
                  <div className={styles.controlWrap}>
                    <AttendanceControl
                      occurrence={occurrence}
                      onMark={(status) => onMarkAttendance(occurrence.id, status)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
