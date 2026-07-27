import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Dialog, Sheet, Field, Input, Select, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { listCourses } from "@/data/repositories/courseRepository";
import { listUnitsForCourse } from "@/data/repositories/unitRepository";
import type { Task } from "@/types/entities";
import styles from "./TaskFormSheet.module.css";

export interface TaskFormValues {
  title: string;
  dueDate?: string;
  courseId?: string;
  unitId?: string;
}

export interface TaskFormSheetProps {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultCourseId?: string;
  defaultUnitId?: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}

/**
 * Task create/edit form (PRODUCT_SPEC.md §6). A task may attach to a Unit,
 * a Course without a specific Unit, or stand fully alone — the course/unit
 * pickers are always optional, never forced.
 */
export function TaskFormSheet({
  open,
  onClose,
  task,
  defaultCourseId,
  defaultUnitId,
  onSubmit,
  onDelete,
}: TaskFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title={task ? "Edit task" : "Add task"}>
      {open && (
        <TaskFormBody
          key={task?.id ?? "new"}
          task={task}
          defaultCourseId={defaultCourseId}
          defaultUnitId={defaultUnitId}
          onClose={onClose}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      )}
    </Overlay>
  );
}

function TaskFormBody({
  task,
  defaultCourseId,
  defaultUnitId,
  onClose,
  onSubmit,
  onDelete,
}: {
  task?: Task;
  defaultCourseId?: string;
  defaultUnitId?: string;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const courses = useLiveQuery(() => listCourses(), []) ?? [];

  const [title, setTitle] = useState(task?.title ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [courseId, setCourseId] = useState(task?.courseId ?? defaultCourseId ?? "");
  const [unitId, setUnitId] = useState(task?.unitId ?? defaultUnitId ?? "");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const units =
    useLiveQuery(() => (courseId ? listUnitsForCourse(courseId) : []), [courseId]) ?? [];

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        dueDate: dueDate || undefined,
        courseId: courseId || undefined,
        unitId: unitId || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save this task locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Task title" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <Field label="Due date" hint="Optional — tasks with no due date show under 'No due date.'">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        )}
      </Field>
      <Field label="Course" hint="Optional.">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setUnitId("");
            }}
          >
            <option value="">No course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {courseId && units.length > 0 && (
        <Field label="Unit" hint="Optional.">
          {(fieldProps) => (
            <Select {...fieldProps} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">No specific unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <div className={styles.actions}>
        <Button onClick={handleSubmit} loading={submitting}>
          {task ? "Save changes" : "Add task"}
        </Button>
        {task && onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            Delete task
          </Button>
        )}
      </div>
    </div>
  );
}
