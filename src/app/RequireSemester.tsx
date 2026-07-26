import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getActiveSemester } from "@/data/repositories/semesterRepository";
import { Skeleton } from "@/components";
import type { Semester } from "@/types/entities";

/**
 * Gates semester-dependent routes behind Semester Setup — this check is
 * real (backed by Dexie), not simulated, per STAGE_1A_UX_ARCHITECTURE.md
 * §S: "everything semester-dependent ... stays gated behind Semester
 * Setup." Settings/theme (a separate route, not behind this gate) remains
 * reachable pre-semester because it lives in the preferences database.
 *
 * A one-time check on mount, not a live-updating subscription: the two
 * places that change whether a semester exists (Semester Setup's create,
 * Start New Semester's delete) already `navigate()` explicitly right
 * after the write, which re-mounts this gate on the new route — there is
 * no scenario where the answer needs to change out from under an already
 * -mounted screen.
 */
export function RequireSemester() {
  const [semester, setSemester] = useState<Semester | undefined | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveSemester().then((result) => {
      if (!cancelled) setSemester(result ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (semester === null) {
    return <Skeleton style={{ height: 200, margin: 16 }} />;
  }
  if (!semester) {
    return <Navigate to="/semester-setup" replace />;
  }
  return <Outlet />;
}
