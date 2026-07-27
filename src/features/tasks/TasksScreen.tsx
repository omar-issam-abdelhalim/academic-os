import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { EmptyState, IconButton } from "@/components";
import { TaskRow, type TaskRowData } from "@/features/shared/TaskRow";
import { useTasks } from "@/features/shared/useTasks";
import { TaskFormSheet } from "./TaskFormSheet";
import { listCourses } from "@/data/repositories/courseRepository";
import { createTask, updateTask, deleteTask } from "@/data/repositories/taskRepository";
import { bucketForDate, getAcademicWeek, formatWeekRange } from "@/domain/academicWeek";
import type { Task } from "@/types/entities";
import styles from "./TasksScreen.module.css";

/**
 * Global Tasks (STAGE_1A_UX_ARCHITECTURE.md §J): Overdue / Today /
 * Upcoming (grouped by academic week, current week expanded)/No due date.
 * Backed by real `taskRepository` data via the shared `useTasks` hook
 * (Stage 3) — the identical hook Home and Course/Unit-scoped views use, so
 * completion state is always consistent everywhere.
 */
export function TasksScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, toggle, undo, undoState } = useTasks();
  const coursesQuery = useLiveQuery(() => listCourses(), []);
  const courses = useMemo(() => coursesQuery ?? [], [coursesQuery]);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const now = useMemo(() => new Date(), []);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const newTaskCourseId = searchParams.get("newTaskCourseId") ?? undefined;
  const newTaskUnitId = searchParams.get("newTaskUnitId") ?? undefined;
  // Arriving here from Course/Unit Detail's "Add task" or the command
  // palette's "Add task" quick-add — derived directly during render (no
  // effect needed) so the form opens on the very first render.
  const openFromQuery = Boolean(newTaskCourseId) || searchParams.get("new") === "1";

  function closeForm() {
    setFormOpen(false);
    setEditingTask(undefined);
    if (openFromQuery) setSearchParams({});
  }

  function toRowData(task: Task): TaskRowData {
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
      courseLabel: task.courseId ? courseById.get(task.courseId)?.name : undefined,
      dueLabel,
      overdue,
    };
  }

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

  function openTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setEditingTask(task);
      setFormOpen(true);
    }
  }

  const isEmpty =
    groups.overdue.length === 0 &&
    groups.today.length === 0 &&
    groups.upcoming.length === 0 &&
    groups.noDueDate.length === 0;

  return (
    <div>
      <ScreenHeader
        title="Tasks"
        action={
          <IconButton
            aria-label="Add task"
            onClick={() => {
              setEditingTask(undefined);
              setFormOpen(true);
            }}
          >
            <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        }
      />
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
                <TaskRow key={t.id} task={toRowData(t)} onToggle={toggle} onOpen={openTask} />
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
                <TaskRow key={t.id} task={toRowData(t)} onToggle={toggle} onOpen={openTask} />
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
                          task={toRowData(t)}
                          onToggle={toggle}
                          onOpen={openTask}
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
                <TaskRow key={t.id} task={toRowData(t)} onToggle={toggle} onOpen={openTask} />
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
                  <TaskRow key={t.id} task={toRowData(t)} onToggle={toggle} onOpen={openTask} />
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

      <TaskFormSheet
        open={formOpen || openFromQuery}
        onClose={closeForm}
        task={editingTask}
        defaultCourseId={newTaskCourseId}
        defaultUnitId={newTaskUnitId}
        onSubmit={async (values) => {
          if (editingTask) {
            await updateTask(editingTask.id, values);
          } else {
            await createTask(values);
          }
        }}
        onDelete={
          editingTask
            ? async () => {
                await deleteTask(editingTask.id);
                closeForm();
              }
            : undefined
        }
      />
    </div>
  );
}
