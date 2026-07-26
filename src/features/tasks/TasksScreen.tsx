import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenHeader } from "@/app/ScreenHeader";
import { EmptyState } from "@/components";
import { TaskRow, type TaskRowData } from "@/features/shared/TaskRow";
import { useFixtureTasks } from "@/features/shared/useFixtureTasks";
import { bucketForDate, getAcademicWeek, formatWeekRange } from "@/domain/academicWeek";
import { courseById } from "@/fixtures";
import type { Task } from "@/types/entities";
import styles from "./TasksScreen.module.css";

function toRowData(task: Task, now: Date): TaskRowData {
  const course = task.courseId ? courseById(task.courseId) : undefined;
  const overdue = task.dueDate ? bucketForDate(new Date(task.dueDate), now) === "overdue" : false;
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : undefined;
  return {
    id: task.id,
    title: task.title,
    completed: task.completed,
    courseLabel: course?.name,
    dueLabel,
    overdue,
  };
}

/**
 * Global Tasks (STAGE_1A_UX_ARCHITECTURE.md §J): Overdue / Today /
 * Upcoming (grouped by academic week, current week expanded, later weeks
 * collapsed) / No due date. Reuses the identical TaskRow used on Home and
 * will be reused by Course/Unit-scoped views in Stage 3.
 */
export function TasksScreen() {
  const navigate = useNavigate();
  const { tasks, toggle, undo, undoState } = useFixtureTasks();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  // Stable for the component's lifetime — a reference screen doesn't need
  // per-second freshness, and this keeps the useMemo below correctly
  // memoized instead of recomputing (and re-triggering the lint warning)
  // on every render.
  const now = useMemo(() => new Date(), []);

  const groups = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed);
    const overdue = incomplete.filter(
      (t) => t.dueDate && bucketForDate(new Date(t.dueDate), now) === "overdue",
    );
    const today = incomplete.filter(
      (t) => t.dueDate && bucketForDate(new Date(t.dueDate), now) === "today",
    );
    const upcoming = incomplete.filter(
      (t) => t.dueDate && bucketForDate(new Date(t.dueDate), now) === "upcoming",
    );
    const noDueDate = incomplete.filter((t) => !t.dueDate);
    const completed = tasks.filter((t) => t.completed);

    const byWeek = new Map<string, { label: string; tasks: Task[] }>();
    for (const task of upcoming.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))) {
      const week = getAcademicWeek(new Date(task.dueDate!));
      const key = week.start.toISOString();
      if (!byWeek.has(key)) byWeek.set(key, { label: formatWeekRange(week), tasks: [] });
      byWeek.get(key)!.tasks.push(task);
    }

    return { overdue, today, upcoming: Array.from(byWeek.entries()), noDueDate, completed };
  }, [tasks, now]);

  const currentWeekKey = getAcademicWeek(now).start.toISOString();

  function toggleWeek(key: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isEmpty =
    groups.overdue.length === 0 &&
    groups.today.length === 0 &&
    groups.upcoming.length === 0 &&
    groups.noDueDate.length === 0;

  return (
    <div>
      <ScreenHeader title="Tasks" />
      <div className={styles.content}>
        {isEmpty && groups.completed.length === 0 && (
          <EmptyState
            title="Nothing due — you're caught up"
            description="Tasks you add from a course or unit will show up here too."
          />
        )}

        {groups.overdue.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Overdue</h2>
            <ul>
              {groups.overdue.map((t) => (
                <TaskRow
                  key={t.id}
                  task={toRowData(t, now)}
                  onToggle={toggle}
                  onOpen={() => navigate(`/tasks?task=${t.id}`)}
                />
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className={styles.sectionTitle}>Today</h2>
          {groups.today.length === 0 ? (
            <p className={styles.muted}>Nothing due today.</p>
          ) : (
            <ul>
              {groups.today.map((t) => (
                <TaskRow
                  key={t.id}
                  task={toRowData(t, now)}
                  onToggle={toggle}
                  onOpen={() => navigate(`/tasks?task=${t.id}`)}
                />
              ))}
            </ul>
          )}
        </section>

        {groups.upcoming.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>Upcoming</h2>
            {groups.upcoming.map(([key, group]) => {
              const isCurrent = key === currentWeekKey;
              const isExpanded = isCurrent || expandedWeeks.has(key);
              return (
                <div key={key} className={styles.weekGroup}>
                  <button
                    type="button"
                    className={styles.weekHeader}
                    onClick={() => toggleWeek(key)}
                  >
                    {isCurrent ? "This week" : group.label} ({group.tasks.length})
                  </button>
                  {isExpanded && (
                    <ul>
                      {group.tasks.map((t) => (
                        <TaskRow
                          key={t.id}
                          task={toRowData(t, now)}
                          onToggle={toggle}
                          onOpen={() => navigate(`/tasks?task=${t.id}`)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {groups.noDueDate.length > 0 && (
          <section>
            <h2 className={styles.sectionTitle}>No due date</h2>
            <ul>
              {groups.noDueDate.map((t) => (
                <TaskRow
                  key={t.id}
                  task={toRowData(t, now)}
                  onToggle={toggle}
                  onOpen={() => navigate(`/tasks?task=${t.id}`)}
                />
              ))}
            </ul>
          </section>
        )}

        {groups.completed.length > 0 && (
          <section>
            <button
              type="button"
              className={styles.weekHeader}
              onClick={() => setShowCompleted((s) => !s)}
            >
              Completed ({groups.completed.length})
            </button>
            {showCompleted && (
              <ul>
                {groups.completed.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={toRowData(t, now)}
                    onToggle={toggle}
                    onOpen={() => navigate(`/tasks?task=${t.id}`)}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {undoState && (
        <div className={styles.snackbar} role="status">
          <span>Task updated.</span>
          <button type="button" onClick={undo} className={styles.undoButton}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
