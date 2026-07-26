import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScreenHeader } from "@/app/ScreenHeader";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useFixtureSchedule } from "@/features/shared/useFixtureSchedule";
import { academicWeekDays, formatWeekRange, getAcademicWeek } from "@/domain/academicWeek";
import { WeekOverview } from "./WeekOverview";
import { DayDetail } from "./DayDetail";
import { WeekGrid } from "./WeekGrid";
import styles from "./ScheduleScreen.module.css";

/**
 * Schedule: mobile Compact Week Overview → Day Detail hybrid, desktop full
 * week grid — both views of one screen (STAGE_1A_UX_ARCHITECTURE.md §K).
 * The selected day is a query param so Day Detail is a real, shareable
 * deep link even though it isn't a separate route.
 */
export function ScheduleScreen() {
  const isDesktop = useIsDesktop();
  const { occurrences, markAttendance } = useFixtureSchedule();
  const [searchParams, setSearchParams] = useSearchParams();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const days = academicWeekDays(now);
  const weekLabel = formatWeekRange(getAcademicWeek(now));

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
    setSearchParams({ day: d.toISOString().slice(0, 10) });
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
              onSelectDay={selectDay}
              todayIso={todayIso}
            />
          </>
        )}
      </div>
    </div>
  );
}
