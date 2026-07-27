import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ScreenHeader } from "@/app/ScreenHeader";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useOccurrencesForDates, markAttendance } from "@/features/shared/useSchedule";
import { listCourses } from "@/data/repositories/courseRepository";
import { academicWeekDays, formatWeekRange, getAcademicWeek } from "@/domain/academicWeek";
import { toIsoDate } from "@/domain/scheduleGeneration";
import { WeekOverview } from "./WeekOverview";
import { DayDetail } from "./DayDetail";
import { WeekGrid } from "./WeekGrid";
import styles from "./ScheduleScreen.module.css";

/**
 * Schedule: mobile Compact Week Overview → Day Detail hybrid, desktop full
 * week grid — both views of one screen (STAGE_1A_UX_ARCHITECTURE.md §K).
 * Occurrences are real, lazily-generated `ScheduleOccurrence` rows (Stage
 * 3) — see `useOccurrencesForDates`, not fixtures.
 */
export function ScheduleScreen() {
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const todayIso = toIsoDate(now);
  const days = academicWeekDays(now);
  const weekLabel = formatWeekRange(getAcademicWeek(now));

  const occurrences = useOccurrencesForDates(days);
  const coursesQuery = useLiveQuery(() => listCourses(), []);
  const courses = useMemo(() => coursesQuery ?? [], [coursesQuery]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const occurrencesByDay = useMemo(() => {
    const map = new Map<string, typeof occurrences>();
    for (const occurrence of occurrences) {
      const list = map.get(occurrence.date) ?? [];
      list.push(occurrence);
      map.set(occurrence.date, list);
    }
    return map;
  }, [occurrences]);

  const selectedDay = searchParams.get("day");

  function selectDay(iso: string) {
    setSearchParams({ day: iso });
  }
  function backToWeek() {
    setSearchParams({});
  }
  function shiftDay(delta: number) {
    if (!selectedDay) return;
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + delta);
    setSearchParams({ day: toIsoDate(d) });
  }

  if (isDesktop) {
    return (
      <div>
        <ScreenHeader title="Schedule" />
        <div className={styles.desktopContent}>
          <p className={styles.weekLabel}>{weekLabel}</p>
          <WeekGrid
            days={days}
            occurrencesByDay={occurrencesByDay}
            todayIso={todayIso}
            courseById={courseById}
            onMarkAttendance={markAttendance}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="Schedule" />
      <div className={styles.content}>
        {selectedDay ? (
          <DayDetail
            date={new Date(selectedDay)}
            occurrences={occurrencesByDay.get(selectedDay) ?? []}
            courseById={courseById}
            onBack={backToWeek}
            onPrevDay={() => shiftDay(-1)}
            onNextDay={() => shiftDay(1)}
            onMarkAttendance={markAttendance}
          />
        ) : (
          <>
            <p className={styles.weekLabel}>{weekLabel}</p>
            <WeekOverview
              days={days}
              occurrencesByDay={occurrencesByDay}
              courseById={courseById}
              onSelectDay={selectDay}
              todayIso={todayIso}
            />
          </>
        )}
      </div>
    </div>
  );
}
