import { useMemo, useState } from "react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Select, StatusBadge } from "@/components";
import {
  fixtureCourses,
  fixtureTasks,
  fixtureScheduleOccurrences,
  fixtureGradeEntries,
  fixturePracticeEntries,
} from "@/fixtures";
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
 * Performance Hub (STAGE_1A_UX_ARCHITECTURE.md §N) — Stage 6 will replace
 * these fixture-derived numbers with real computed analytics from raw
 * Dexie data; this screen establishes the IA slot and layout, not the
 * final analytics engine. Correlational framing only, never causal
 * (PRODUCT_SPEC.md §13).
 */
export function PerformanceScreen() {
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const stats = useMemo(() => {
    const tasks = fixtureTasks.filter((t) => courseFilter === "all" || t.courseId === courseFilter);
    const taskTotal = tasks.length;
    const taskDone = tasks.filter((t) => t.completed).length;

    const occurrences = fixtureScheduleOccurrences.filter(
      (o) => courseFilter === "all" || o.courseId === courseFilter,
    );
    const attended = occurrences.filter((o) => o.status === "attended").length;
    const missed = occurrences.filter((o) => o.status === "missed").length;

    const gradeEntries = fixtureGradeEntries.filter(
      (e) => courseFilter === "all" || e.courseId === courseFilter,
    );
    const gradeTotal = sumRecorded(gradeEntries);

    const practiceEntries = fixturePracticeEntries.filter(
      (p) => courseFilter === "all" || p.courseId === courseFilter,
    );
    const practiceTotal = sumRecorded(practiceEntries);

    return { taskTotal, taskDone, attended, missed, gradeTotal, practiceTotal };
  }, [courseFilter]);

  return (
    <div>
      <ScreenHeader title="Performance" />
      <div className={styles.content}>
        <StatusBadge tone="info" className={styles.disclaimer}>
          Reference data for Stage 2 — not yet calculated from your real semester.
        </StatusBadge>

        <Select
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All courses</option>
          {fixtureCourses.map((c) => (
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
          <ul className={styles.courseList}>
            {fixtureCourses.map((c) => {
              const entries = fixtureGradeEntries.filter((e) => e.courseId === c.id);
              const total = sumRecorded(entries);
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
          <p className={styles.footnote}>
            Example insight framing (Stage 6 will compute this for real): &ldquo;Units where all
            study tasks were completed had a higher average practice score.&rdquo; Never phrased as
            a guarantee that completing tasks causes higher grades.
          </p>
        </section>
      </div>
    </div>
  );
}
