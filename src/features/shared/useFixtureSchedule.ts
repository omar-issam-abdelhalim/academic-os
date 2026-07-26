import { useState } from "react";
import { fixtureScheduleOccurrences } from "@/fixtures";
import type { ScheduleOccurrence, ScheduleOccurrenceStatus } from "@/types/entities";

/** See useFixtureTasks.ts — same local-state-over-fixture pattern, used so
 * the AttendanceControl demo is genuinely interactive within Stage 2's
 * reference-UI scope. */
export function useFixtureSchedule() {
  const [occurrences, setOccurrences] = useState<ScheduleOccurrence[]>(fixtureScheduleOccurrences);

  function markAttendance(id: string, status: ScheduleOccurrenceStatus) {
    setOccurrences((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  return { occurrences, markAttendance };
}
