import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertCircle, Info, MapPin, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/classNames";
import { semesterDb } from "@/data/db";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, EmptyState } from "@/components";
import { AttendanceControl } from "@/features/shared/AttendanceControl";
import { TaskRow } from "@/features/shared/TaskRow";
import { useTasks } from "@/features/shared/useTasks";
import { useOccurrencesForDates, markAttendance } from "@/features/shared/useSchedule";
import { useInsights } from "@/features/shared/useAnalytics";
import { listCourses } from "@/data/repositories/courseRepository";
import { findCurrentOrNextToday, occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import { bucketForDate, academicWeekDays } from "@/domain/academicWeek";
import styles from "./HomeScreen.module.css";

const INSIGHT_ICON = { attention: AlertCircle, positive: TrendingUp, info: Info } as const;

/**
 * Home — answers "what do I need to do, and where am I today?" in under
 * five seconds (STAGE_1A_UX_ARCHITECTURE.md §G). Deliberately excludes
 * charts/full analytics dashboard/full course grid — those live in
 * Performance/Courses. STAGE_1A_UX_ARCHITECTURE.md §G is explicit that
 * Home may show "at most one plain-text weekly stat" once there's enough
 * data to be meaningful, never a chart or widget — Stage 4's single
 * top-priority insight line (below the task list) is exactly that one
 * line, sourced from the same deterministic insight engine Performance
 * uses, never a duplicate of that fuller dashboard.
 * Fully backed by real repositories (Stage 3/4) — no fixtures.
 */
export function HomeScreen() {
  const navigate = useNavigate();
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);
  const { tasks, toggle } = useTasks();
  const coursesQuery = useLiveQuery(() => listCourses(), []);
  const courses = useMemo(() => coursesQuery ?? [], [coursesQuery]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const insights = useInsights(1);
  const topInsight = insights?.[0];
  const [checkInDismissed, setCheckInDismissed] = useState(false);

  const now = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => academicWeekDays(now), [now]);
  const occurrences = useOccurrencesForDates(weekDays);
  const currentOrNext = findCurrentOrNextToday(occurrences, now);

  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && bucketForDate(new Date(t.dueDate), now) === "overdue",
  );
  const dueToday = tasks.filter(
    (t) => !t.completed && t.dueDate && bucketForDate(new Date(t.dueDate), now) === "today",
  );

  function taskRowData(task: (typeof tasks)[number]) {
    const course = task.courseId ? courseById.get(task.courseId) : undefined;
    return {
      id: task.id,
      title: task.title,
      completed: task.completed,
      courseLabel: course?.name,
      dueLabel: task.dueDate
        ? bucketForDate(new Date(task.dueDate), now) === "overdue"
          ? "Overdue"
          : "Today"
        : undefined,
      overdue: task.dueDate ? bucketForDate(new Date(task.dueDate), now) === "overdue" : false,
    };
  }

  const hasNoCourses = courses.length === 0;

  return (
    <div>
      <ScreenHeader title="Home" />
      <div className={styles.content}>
        {semester && (
          <p className={styles.semesterLabel}>
            {semester.academicYear} · {semester.label}
          </p>
        )}

        {!hasNoCourses && (
          <section aria-label="Today's class" className={styles.classCard}>
            {currentOrNext.kind === "none" ? (
              <p className={styles.noClasses}>No more classes today.</p>
            ) : (
              (() => {
                const occurrence = currentOrNext.occurrence;
                const course = courseById.get(occurrence.courseId);
                const { start, end } = occurrenceDateTimes(occurrence);
                const time = `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
                return (
                  <>
                    <p className={styles.classEyebrow}>
                      {currentOrNext.kind === "in-progress" ? "In progress" : "Next class"}
                    </p>
                    <h2 className={styles.className}>
                      {course?.name} — {occurrence.type}
                    </h2>
                    <p className={styles.classTime}>
                      <span className={cn("numeric", styles.timeValue)}>{time}</span>
                      {occurrence.location && (
                        <span className={styles.location}>
                          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />{" "}
                          {occurrence.location}
                        </span>
                      )}
                    </p>
                    {currentOrNext.kind === "in-progress" && (
                      <div className={styles.attendance}>
                        <AttendanceControl
                          occurrence={occurrence}
                          onMark={(status) => markAttendance(occurrence.id, status)}
                          now={now}
                        />
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </section>
        )}

        <section aria-label="Overdue and today's tasks" className={styles.taskSection}>
          {overdue.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>Overdue ({overdue.length})</h3>
              <ul>
                {overdue.slice(0, 3).map((t) => (
                  <TaskRow
                    key={t.id}
                    task={taskRowData(t)}
                    onToggle={toggle}
                    onOpen={() => navigate("/tasks")}
                  />
                ))}
              </ul>
            </>
          )}
          <h3 className={styles.sectionTitle}>Today</h3>
          {dueToday.length === 0 ? (
            <p className={styles.caughtUp}>Nothing due today — you&rsquo;re caught up.</p>
          ) : (
            <ul>
              {dueToday.map((t) => (
                <TaskRow
                  key={t.id}
                  task={taskRowData(t)}
                  onToggle={toggle}
                  onOpen={() => navigate("/tasks")}
                />
              ))}
            </ul>
          )}
          <Button variant="ghost" size="small" onClick={() => navigate("/tasks")}>
            View all tasks →
          </Button>
        </section>

        {topInsight && topInsight.category !== "onboarding" && (
          <button
            type="button"
            className={styles.insightLine}
            onClick={() => navigate("/performance")}
            aria-label={`${topInsight.message} View Performance for more.`}
          >
            {(() => {
              const Icon = INSIGHT_ICON[topInsight.severity];
              return (
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className={styles.insightIcon}
                  data-severity={topInsight.severity}
                  aria-hidden="true"
                />
              );
            })()}
            <span>{topInsight.message}</span>
          </button>
        )}

        {!checkInDismissed && (
          <section className={styles.checkIn} aria-label="Weekly check-in prompt">
            <p>How&rsquo;s this week going?</p>
            <div className={styles.checkInActions}>
              <Button
                size="small"
                variant="secondary"
                disabled
                title="Weekly check-in arrives in a later stage"
              >
                Quick check-in
              </Button>
              <button
                type="button"
                className={styles.dismiss}
                aria-label="Dismiss weekly check-in prompt"
                onClick={() => setCheckInDismissed(true)}
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </section>
        )}

        {hasNoCourses && (
          <EmptyState
            title="Add your first course"
            description="Once you add a course, Home will show what's next."
            action={
              <Button size="small" onClick={() => navigate("/courses")}>
                Go to Courses
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
