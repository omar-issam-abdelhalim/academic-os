import { useCallback, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listTasks, toggleTaskCompletion } from "@/data/repositories/taskRepository";

/**
 * Real, shared task state backed by `taskRepository` — replaces Stage 2's
 * `useFixtureTasks`. Reactive via `dexie-react-hooks`' `useLiveQuery`, so
 * every screen using this hook (Home, Tasks, Course/Unit-scoped lists)
 * sees the same data and stays in sync without any manual refetch —
 * toggling a task on Home is immediately reflected on the Tasks screen.
 * Completion toggles always go through `toggleTaskCompletion`, which
 * appends a `TaskCompletionEvent` row (DATA_MODEL.md) rather than just
 * flipping a boolean.
 */
export function useTasks() {
  const tasks = useLiveQuery(() => listTasks(), []);
  const [undoState, setUndoState] = useState<{ id: string; previous: boolean } | null>(null);

  const toggle = useCallback(
    async (id: string, completed: boolean) => {
      const previous = (tasks ?? []).find((t) => t.id === id)?.completed ?? !completed;
      await toggleTaskCompletion(id, completed);
      setUndoState({ id, previous });
      window.setTimeout(() => setUndoState((s) => (s?.id === id ? null : s)), 4000);
    },
    [tasks],
  );

  const undo = useCallback(async () => {
    if (!undoState) return;
    await toggleTaskCompletion(undoState.id, undoState.previous);
    setUndoState(null);
  }, [undoState]);

  return { tasks: tasks ?? [], loading: tasks === undefined, toggle, undo, undoState };
}
