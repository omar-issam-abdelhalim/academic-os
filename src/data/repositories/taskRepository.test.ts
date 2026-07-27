import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import {
  createTask,
  deleteTask,
  listCompletionEvents,
  toggleTaskCompletion,
} from "./taskRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

describe("taskRepository", () => {
  it("creates a task incomplete by default", async () => {
    const task = await createTask({ title: "Study" });
    expect(task.completed).toBe(false);
    expect(task.completedAt).toBeUndefined();
  });

  it("toggling complete sets Task.completed/completedAt and appends a TaskCompletionEvent", async () => {
    const task = await createTask({ title: "Study" });
    const updated = await toggleTaskCompletion(task.id, true);
    expect(updated.completed).toBe(true);
    expect(updated.completedAt).toBeDefined();

    const events = await listCompletionEvents(task.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.toggledTo).toBe(true);
  });

  it("Incomplete -> Complete -> Incomplete -> Complete retains every transition in history, not just the current state", async () => {
    const task = await createTask({ title: "Study" });
    await toggleTaskCompletion(task.id, true);
    await toggleTaskCompletion(task.id, false);
    const final = await toggleTaskCompletion(task.id, true);

    expect(final.completed).toBe(true);
    const events = await listCompletionEvents(task.id);
    expect(events.map((e) => e.toggledTo)).toEqual([true, false, true]);
  });

  it("uncompleting clears completedAt rather than retaining a stale prior timestamp", async () => {
    const task = await createTask({ title: "Study" });
    await toggleTaskCompletion(task.id, true);
    const updated = await toggleTaskCompletion(task.id, false);
    expect(updated.completed).toBe(false);
    expect(updated.completedAt).toBeUndefined();
  });

  it("deleteTask cascades to delete its TaskCompletionEvent history", async () => {
    const task = await createTask({ title: "Study" });
    await toggleTaskCompletion(task.id, true);
    await deleteTask(task.id);

    expect(await semesterDb.tasks.get(task.id)).toBeUndefined();
    expect(await listCompletionEvents(task.id)).toHaveLength(0);
  });
});
