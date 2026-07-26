import { useState } from "react";
import { Sparkles } from "lucide-react";
import { EmptyState, Button, StatusBadge } from "@/components";
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
 *
 * "Add practice score" is reference-only in Stage 2 (no PracticeEntry
 * repository exists yet) — clicking it shows an explicit message rather
 * than doing nothing.
 */
export function PracticeSection({ entries }: PracticeSectionProps) {
  const [message, setMessage] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />}
        title="No practice scores yet"
        description="Practice scores help you gauge your own understanding — they never affect your official grade."
        action={
          <div className={styles.actionStack}>
            <Button
              size="small"
              onClick={() =>
                setMessage(
                  "Recording practice scores arrives in Stage 5 — this button is a reference placeholder for now.",
                )
              }
            >
              Add practice score
            </Button>
            {message && <StatusBadge tone="info">{message}</StatusBadge>}
          </div>
        }
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
