import { Sparkles } from "lucide-react";
import { EmptyState, Button } from "@/components";
import type { PracticeEntry } from "@/types/entities";
import styles from "./PracticeSection.module.css";

export interface PracticeSectionProps {
  entries: PracticeEntry[];
}

/**
 * Never inside the Grades tab — distinct icon/accent everywhere Practice
 * appears, distinct empty-state copy (STAGE_1A_UX_ARCHITECTURE.md §M).
 * Practice entries are never summed into or displayed as comparable to
 * GradeEntries.
 */
export function PracticeSection({ entries }: PracticeSectionProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />}
        title="No practice scores yet"
        description="Practice scores help you gauge your own understanding — they never affect your official grade."
        action={<Button size="small">Add practice score</Button>}
      />
    );
  }

  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles.row}>
          <Sparkles size={16} strokeWidth={1.5} className={styles.icon} aria-hidden="true" />
          <span className={styles.label}>{entry.label}</span>
          <span className={styles.score}>
            <span className="numeric">
              {entry.scoreEarned}/{entry.scoreMax}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
