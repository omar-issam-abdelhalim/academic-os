import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { MapPin, X } from "lucide-react";
import { cn } from "@/lib/classNames";
import { semesterDb } from "@/data/db";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, EmptyState } from "@/components";
import { AttendanceControl } from "@/features/shared/AttendanceControl";
import { TaskRow } from "@/features/shared/TaskRow";
import { useFixtureTasks } from "@/features/shared/useFixtureTasks";
import { useFixtureSchedule } from "@/features/shared/useFixtureSchedule";
import { findCurrentOrNextToday, occurrenceDateTimes } from "@/domain/scheduleOccurrence";
import { bucketForDate } from "@/domain/academicWeek";
import { courseById } from "@/fixtures";
import styles from "./HomeScreen.module.css";

/**
 * Home — answers "what do I need to do, and where am I today?" in under
 * five seconds (STAGE_1A_UX_ARCHITECTURE.md §G). Deliberately excludes
 * charts/analytics/full course grid — those live in Performance/Courses.
 */
export function HomeScreen() {
  const navigate = useNavigate();
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);
  const { tasks, toggle } = useFixtureTasks();
  const { occurrences, markAttendance } = useFixtureSchedule();
  const [checkInDismissed, setCheckInDismissed] = useState(false);

  const now = new Date();
  const currentOrNext = findCurrentOrNextToday(occurrences, now);

  const overdue = tasks.filter(
    (t) => !t.completed && t.dueDate && bucketForDate(new Date(t.dueDate), now) === "overdue",
  );
  const dueToday = tasks.filter(
    (t) => !t.completed && t.dueDate && bucketForDate(new Date(t.dueDate), now) === "today",
  );

  function taskRowData(task: (typeof tasks)[number]) {
    const course = task.courseId ? courseById(task.courseId) : undefined;
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

  return (
    <div>
      <ScreenHeader title="Home" />
      <div className={styles.content}>
        {semester && (
          <p className={styles.semesterLabel}>
            {semester.academicYear} · {semester.label}
          </p>
        )}

        <section aria-label="Today's class" className={styles.classCard}>
          {currentOrNext.kind === "none" ? (
            <p className={styles.noClasses}>No more classes today.</p>
          ) : (
            (() => {
              const occurrence = currentOrNext.occurrence;
              const course = courseById(occurrence.courseId);
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

        {!checkInDismissed && (
          <section className={styles.checkIn} aria-label="Weekly check-in prompt">
            <p>How&rsquo;s this week going?</p>
            <div className={styles.checkInActions}>
              <Button size="small" variant="secondary">
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

        {tasks.length === 0 && (
          <EmptyState
            title="Add your first course"
            description="Once you add a course, Home will show what's next."
          />
        )}
      </div>
    </div>
  );
}
