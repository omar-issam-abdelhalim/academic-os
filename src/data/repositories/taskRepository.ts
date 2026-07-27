import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { createId } from "@/domain/id";
import type { Task, TaskCompletionEvent } from "@/types/entities";

export async function listTasks(): Promise<Task[]> {
  return withStorageErrorHandling(() => semesterDb.tasks.toArray());
}

export async function listTasksForCourse(courseId: string): Promise<Task[]> {
  return withStorageErrorHandling(() =>
    semesterDb.tasks.where("courseId").equals(courseId).toArray(),
  );
}

export async function listTasksForUnit(unitId: string): Promise<Task[]> {
  return withStorageErrorHandling(() => semesterDb.tasks.where("unitId").equals(unitId).toArray());
}

export async function getTask(id: string): Promise<Task | undefined> {
  return withStorageErrorHandling(() => semesterDb.tasks.get(id));
}

export interface CreateTaskInput {
  title: string;
  courseId?: string;
  unitId?: string;
  dueDate?: string;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return withStorageErrorHandling(async () => {
    const now = new Date().toISOString();
    const task: Task = {
      id: createId(),
      title: input.title,
      courseId: input.courseId,
      unitId: input.unitId,
      dueDate: input.dueDate,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };
    await semesterDb.tasks.put(task);
    return task;
  });
}

export type UpdateTaskInput = Partial<Pick<Task, "title" | "dueDate" | "courseId" | "unitId">>;

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.tasks.update(id, { ...patch, updatedAt: new Date().toISOString() });
  });
}

/**
 * The one place a task's completion state changes (DATA_MODEL.md
 * §TaskCompletionEvent). Every toggle — in either direction — appends a
 * new, immutable `TaskCompletionEvent` row *and* updates the `Task`'s
 * derived `completed`/`completedAt` convenience fields, inside a single
 * transaction so the two can never disagree. The event log is the actual
 * source of truth for analytics/export; `Task.completed`/`completedAt`
 * only ever reflect the *current* state, never retain a stale prior
 * timestamp once toggled back off.
 */
export async function toggleTaskCompletion(id: string, toggledTo: boolean): Promise<Task> {
  return withStorageErrorHandling(async () => {
    return semesterDb.transaction(
      "rw",
      semesterDb.tasks,
      semesterDb.taskCompletionEvents,
      async () => {
        const now = new Date().toISOString();
        const event: TaskCompletionEvent = { id: createId(), taskId: id, toggledTo, at: now };
        await semesterDb.taskCompletionEvents.put(event);
        const patch: Partial<Task> = {
          completed: toggledTo,
          completedAt: toggledTo ? now : undefined,
          updatedAt: now,
        };
        await semesterDb.tasks.update(id, patch);
        const updated = await semesterDb.tasks.get(id);
        if (!updated) throw new Error("Task not found after completion toggle.");
        return updated;
      },
    );
  });
}

export async function listCompletionEvents(taskId: string): Promise<TaskCompletionEvent[]> {
  return withStorageErrorHandling(async () => {
    const events = await semesterDb.taskCompletionEvents.where("taskId").equals(taskId).toArray();
    return events.sort((a, b) => a.at.localeCompare(b.at));
  });
}

/** Deleting a Task cascades to its TaskCompletionEvent rows — the event
 * log only has meaning for a task that still exists (DATA_MODEL.md). */
export async function deleteTask(id: string): Promise<void> {
  return withStorageErrorHandling(async () => {
    await semesterDb.transaction(
      "rw",
      semesterDb.tasks,
      semesterDb.taskCompletionEvents,
      async () => {
        const events = await semesterDb.taskCompletionEvents.where("taskId").equals(id).toArray();
        await semesterDb.taskCompletionEvents.bulkDelete(events.map((e) => e.id));
        await semesterDb.tasks.delete(id);
      },
    );
  });
}
