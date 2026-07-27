import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Select, StatusBadge } from "@/components";
import { semesterDb } from "@/data/db";
import { sumRecorded } from "@/domain/gradeSummary";
import styles from "./PerformanceScreen.module.css";

function StatBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "success" | "info" | "warning";
}) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className={styles.stat}>
      <div className={styles.statHeader}>
        <span>{label}</span>
        <span className="numeric">{percent}%</span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} data-tone={tone} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/**
 * Performance Hub (STAGE_1A_UX_ARCHITECTURE.md §N) — totals below are real,
 * computed from the same repositories every other screen uses (Stage 3).
 * The deeper analytics engine (weekly/semester trends, strongest units,
 * correlation insights) remains explicitly deferred to a later stage; this
 * screen shows honest current totals, not a final analytics product.
 * Correlational framing only, never causal (PRODUCT_SPEC.md §13).
 */
export function PerformanceScreen() {
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const coursesQuery = useLiveQuery(() => semesterDb.courses.toArray(), []);
  const tasksQuery = useLiveQuery(() => semesterDb.tasks.toArray(), []);
  const occurrencesQuery = useLiveQuery(() => semesterDb.scheduleOccurrences.toArray(), []);
  const gradeEntriesQuery = useLiveQuery(() => semesterDb.gradeEntries.toArray(), []);
  const practiceEntriesQuery = useLiveQuery(() => semesterDb.practiceEntries.toArray(), []);
  const courses = useMemo(() => coursesQuery ?? [], [coursesQuery]);
  const gradeEntries = useMemo(() => gradeEntriesQuery ?? [], [gradeEntriesQuery]);

  const stats = useMemo(() => {
    const tasks = tasksQuery ?? [];
    const occurrences = occurrencesQuery ?? [];
    const entries = gradeEntriesQuery ?? [];
    const practiceEntries = practiceEntriesQuery ?? [];

    const filteredTasks = tasks.filter(
      (t) => courseFilter === "all" || t.courseId === courseFilter,
    );
    const taskTotal = filteredTasks.length;
    const taskDone = filteredTasks.filter((t) => t.completed).length;

    const filteredOccurrences = occurrences.filter(
      (o) => courseFilter === "all" || o.courseId === courseFilter,
    );
    const attended = filteredOccurrences.filter((o) => o.status === "attended").length;
    const missed = filteredOccurrences.filter((o) => o.status === "missed").length;

    const filteredGrades = entries.filter(
      (e) => courseFilter === "all" || e.courseId === courseFilter,
    );
    const gradeTotal = sumRecorded(filteredGrades);

    const filteredPractice = practiceEntries.filter(
      (p) => courseFilter === "all" || p.courseId === courseFilter,
    );
    const practiceTotal = sumRecorded(filteredPractice);

    return { taskTotal, taskDone, attended, missed, gradeTotal, practiceTotal };
  }, [courseFilter, tasksQuery, occurrencesQuery, gradeEntriesQuery, practiceEntriesQuery]);

  return (
    <div>
      <ScreenHeader title="Performance" />
      <div className={styles.content}>
        <StatusBadge tone="info" className={styles.disclaimer}>
          Real totals from your semester data — weekly/semester trend analytics arrive in a later
          stage.
        </StatusBadge>

        <Select
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <div className={styles.grid}>
          <StatBar
            label="Task completion"
            value={stats.taskDone}
            max={stats.taskTotal || 1}
            tone="info"
          />
          <StatBar
            label="Attendance"
            value={stats.attended}
            max={stats.attended + stats.missed || 1}
            tone="success"
          />
          {stats.gradeTotal.max > 0 && (
            <StatBar
              label="Grades recorded"
              value={stats.gradeTotal.earned}
              max={stats.gradeTotal.max}
              tone="info"
            />
          )}
          {stats.practiceTotal.max > 0 && (
            <StatBar
              label="Practice average"
              value={stats.practiceTotal.earned}
              max={stats.practiceTotal.max}
              tone="warning"
            />
          )}
        </div>

        <section className={styles.insightSection}>
          <h3 className={styles.sectionTitle}>Course comparison</h3>
          {courses.length === 0 ? (
            <p className={styles.footnote}>Add a course to see it compared here.</p>
          ) : (
            <ul className={styles.courseList}>
              {courses.map((c) => {
                const courseEntries = gradeEntries.filter((e) => e.courseId === c.id);
                const total = sumRecorded(courseEntries);
                return (
                  <li key={c.id} className={styles.courseRow}>
                    <span>{c.name}</span>
                    <span className="numeric">
                      {total.max > 0 ? `${total.earned}/${total.max}` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className={styles.footnote}>
            Example insight framing (a later stage will compute this for real): &ldquo;Units where
            all study tasks were completed had a higher average practice score.&rdquo; Never phrased
            as a guarantee that completing tasks causes higher grades.
          </p>
        </section>
      </div>
    </div>
  );
}
