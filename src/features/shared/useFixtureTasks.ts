import { useState } from "react";
import { fixtureTasks } from "@/fixtures";
import type { Task } from "@/types/entities";

/**
 * Local, in-memory toggle state over the Tasks fixture — lets the
 * reference UI demonstrate real interaction (checkbox toggles, undo)
 * without writing to Dexie. Each screen instance has its own copy; this
 * is a documented Stage 2 reference-UI limitation (see
 * docs/STAGE_2_REPORT.md), not a data-sync bug — real cross-screen sync
 * arrives with the Stage 3 Task repository.
 */
export function useFixtureTasks() {
  const [tasks, setTasks] = useState<Task[]>(fixtureTasks);
  const [undoState, setUndoState] = useState<{ id: string; previous: boolean } | null>(null);

  function toggle(id: string, completed: boolean) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined }
          : t,
      ),
    );
    const previous = tasks.find((t) => t.id === id)?.completed ?? !completed;
    setUndoState({ id, previous });
    window.setTimeout(() => setUndoState((s) => (s?.id === id ? null : s)), 4000);
  }

  function undo() {
    if (!undoState) return;
    toggle(undoState.id, undoState.previous);
    setUndoState(null);
  }

  return { tasks, toggle, undo, undoState };
}
