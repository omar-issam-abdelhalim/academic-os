import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Select, Skeleton } from "@/components";
import { useSemesterAnalytics } from "@/features/shared/useAnalytics";
import { generateInsights } from "@/domain/analytics/insights";
import type { CourseAnalyticsProfile } from "@/domain/analytics/courseAnalytics";
import { TrendChart, type TrendChartPoint } from "./TrendChart";
import { InsightCard } from "./InsightCard";
import styles from "./PerformanceScreen.module.css";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatWeekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function StatCard({
  label,
  percent,
  detail,
  tone,
}: {
  label: string;
  percent: number | undefined;
  detail: string;
  tone: "success" | "info" | "warning";
}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statHeader}>
        <span>{label}</span>
        {percent !== undefined && <span className="numeric">{round1(percent)}%</span>}
      </div>
      {percent !== undefined ? (
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            data-tone={tone}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      ) : (
        <p className={styles.noData}>No data yet</p>
      )}
      <p className={styles.statDetail}>{detail}</p>
    </div>
  );
}

/**
 * Performance Hub (STAGE_1A_UX_ARCHITECTURE.md §N) — the primary Academic
 * Analytics dashboard (Stage 4). No dedicated Course Detail analytics tab
 * exists (§H) — a course's trend data lives here, reached either via this
 * screen's own course filter or a "View analytics" link from Course
 * Detail (`?course=` query param). Every metric distinguishes "no data
 * yet" from a real 0%, and every chart requires at least 2 chronological
 * points before it renders at all.
 */
export function PerformanceScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseFilter = searchParams.get("course") ?? "all";
  const analytics = useSemesterAnalytics();

  const insights = useMemo(() => (analytics ? generateInsights(analytics) : []), [analytics]);

  type Scope = {
    tasks: CourseAnalyticsProfile["tasks"];
    attendance: CourseAnalyticsProfile["attendance"];
    grades: CourseAnalyticsProfile["grades"];
    practice: CourseAnalyticsProfile["practice"];
  };
  const scope: Scope | undefined = useMemo(() => {
    if (!analytics) return undefined;
    const course =
      courseFilter === "all"
        ? undefined
        : analytics.courses.find((c) => c.course.id === courseFilter);
    // Falls back to the semester-wide scope if the selected course id no
    // longer resolves (e.g. deleted while this filter was still applied)
    // rather than rendering a dead end.
    if (course) {
      return {
        tasks: course.tasks,
        attendance: course.attendance,
        grades: course.grades,
        practice: course.practice,
      };
    }
    return {
      tasks: analytics.tasks,
      attendance: analytics.attendance,
      grades: analytics.grades,
      practice: analytics.practice,
    };
  }, [analytics, courseFilter]);

  function setCourseFilter(next: string) {
    setSearchParams(next === "all" ? {} : { course: next });
  }

  if (!analytics || !scope) {
    return (
      <div>
        <ScreenHeader title="Performance" />
        <div className={styles.content}>
          <Skeleton style={{ height: 120 }} />
          <Skeleton style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  const attendancePoints: TrendChartPoint[] = scope.attendance.weeklyRates.map((p) => ({
    label: formatWeekLabel(String(p.at)),
    value: p.value,
  }));
  const gradePoints: TrendChartPoint[] = scope.grades.series.map((p) => ({
    label: formatWeekLabel(String(p.at)),
    value: p.value,
  }));
  const practicePoints: TrendChartPoint[] = scope.practice.series.map((p) => ({
    label: formatWeekLabel(String(p.at)),
    value: p.value,
  }));

  return (
    <div>
      <ScreenHeader title="Performance" />
      <div className={styles.content}>
        <Select
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All courses</option>
          {analytics.courses.map(({ course }) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </Select>

        <section aria-label="Semester overview" className={styles.grid}>
          <StatCard
            label="Task completion"
            percent={scope.tasks.completionRate}
            detail={`${scope.tasks.completed} of ${scope.tasks.totalRelevant} tasks completed`}
            tone="info"
          />
          <StatCard
            label="Attendance"
            percent={scope.attendance.attendanceRate}
            detail={`${scope.attendance.attended} attended, ${scope.attendance.missed} missed`}
            tone="success"
          />
          <StatCard
            label="Grades recorded"
            percent={scope.grades.performancePercent}
            detail={`${scope.grades.recordedEarned}/${scope.grades.recordedMax} recorded`}
            tone="info"
          />
          <StatCard
            label="Practice performance"
            percent={scope.practice.normalizedPercent}
            detail={`${scope.practice.recordedEarned}/${scope.practice.recordedMax} recorded`}
            tone="warning"
          />
        </section>

        <section aria-label="Trends">
          <h3 className={styles.sectionTitle}>Trends</h3>
          <div className={styles.chartGrid}>
            <TrendChart
              title="Attendance rate by week"
              data={attendancePoints}
              trend={scope.attendance.trend}
              color="var(--color-status-success)"
              emptyMessage="Not enough recorded attendance yet to show a trend."
            />
            <TrendChart
              title="Grade performance over time"
              data={gradePoints}
              trend={scope.grades.trend}
              color="var(--color-status-info)"
              emptyMessage="Not enough grade history yet to show a trend."
            />
            <TrendChart
              title="Practice performance over time"
              data={practicePoints}
              trend={scope.practice.trend}
              color="var(--color-status-warning)"
              emptyMessage="Not enough practice history yet to show a trend."
            />
          </div>
        </section>

        <section aria-label="Course performance">
          <h3 className={styles.sectionTitle}>Course performance</h3>
          {analytics.courses.length === 0 ? (
            <p className={styles.footnote}>Add a course to see it compared here.</p>
          ) : (
            <div className={styles.courseTable} role="table" aria-label="Per-course metrics">
              <div className={styles.courseTableHeader} role="row">
                <span role="columnheader">Course</span>
                <span role="columnheader">Tasks</span>
                <span role="columnheader">Attendance</span>
                <span role="columnheader">Grades</span>
                <span role="columnheader">Practice</span>
              </div>
              {analytics.courses.map(({ course, tasks, attendance, grades, practice }) => (
                <div key={course.id} className={styles.courseTableRow} role="row">
                  <span role="cell" className={styles.courseName}>
                    {course.name}
                  </span>
                  <span role="cell" className="numeric">
                    {tasks.completionRate !== undefined ? `${round1(tasks.completionRate)}%` : "—"}
                  </span>
                  <span role="cell" className="numeric">
                    {attendance.attendanceRate !== undefined
                      ? `${round1(attendance.attendanceRate)}%`
                      : "—"}
                  </span>
                  <span role="cell" className="numeric">
                    {grades.performancePercent !== undefined
                      ? `${round1(grades.performancePercent)}%`
                      : "—"}
                  </span>
                  <span role="cell" className="numeric">
                    {practice.normalizedPercent !== undefined
                      ? `${round1(practice.normalizedPercent)}%`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Academic insights" className={styles.insightSection}>
          <h3 className={styles.sectionTitle}>Academic insights</h3>
          {insights.length === 0 ? (
            <p className={styles.footnote}>No insights yet — check back once you have more data.</p>
          ) : (
            <ul className={styles.insightList}>
              {insights.slice(0, 6).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ul>
          )}
          <p className={styles.footnote}>
            These observations describe patterns in your own recorded data — never a guarantee of
            future performance, and never a claim that one behavior caused another.
          </p>
        </section>
      </div>
    </div>
  );
}
