import { Checkbox } from "@/components";
import { cn } from "@/lib/classNames";
import styles from "./TaskRow.module.css";

export interface TaskRowData {
  id: string;
  title: string;
  dueLabel?: string;
  courseLabel?: string;
  completed: boolean;
  overdue?: boolean;
}

export interface TaskRowProps {
  task: TaskRowData;
  onToggle: (id: string, completed: boolean) => void;
  onOpen: (id: string) => void;
}

/**
 * The one compact task-row component reused everywhere a task appears —
 * Home's summary, Global Tasks, Course/Unit-scoped lists
 * (STAGE_1A_UX_ARCHITECTURE.md §J: "no separate mini-Tasks-app rebuilt per
 * context"). Completion is an instant optimistic toggle; undo is handled
 * by the caller (a second, opposite TaskCompletionEvent — see
 * DATA_MODEL.md §TaskCompletionEvent), not by this component.
 */
export function TaskRow({ task, onToggle, onOpen }: TaskRowProps) {
  return (
    <li className={cn(styles.row, task.completed && styles.completed)}>
      <Checkbox
        checked={task.completed}
        onChange={(checked) => onToggle(task.id, checked)}
        label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        hideLabel
      />
      <button type="button" className={styles.main} onClick={() => onOpen(task.id)}>
        <span className={styles.title}>{task.title}</span>
        <span className={styles.meta}>
          {task.courseLabel && <span className={styles.course}>{task.courseLabel}</span>}
          {task.dueLabel && (
            <span className={cn(styles.due, task.overdue && !task.completed && styles.overdue)}>
              {task.dueLabel}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
