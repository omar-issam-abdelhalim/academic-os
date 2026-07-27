import { useState } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { EmptyState, Button, IconButton } from "@/components";
import { createPracticeEntry, deletePracticeEntry } from "@/data/repositories/practiceRepository";
import { PracticeEntryFormSheet } from "./PracticeEntryFormSheet";
import type { PracticeEntry } from "@/types/entities";
import styles from "./PracticeSection.module.css";

export interface PracticeSectionProps {
  courseId: string;
  unitId?: string;
  entries: PracticeEntry[];
}

/**
 * Never inside the Grades tab — distinct icon/accent everywhere Practice
 * appears, distinct empty-state copy (STAGE_1A_UX_ARCHITECTURE.md §M).
 * Practice entries are never summed into or displayed as comparable to
 * GradeEntries. Backed by real `practiceRepository` data (Stage 3).
 */
export function PracticeSection({ courseId, unitId, entries }: PracticeSectionProps) {
  const [formOpen, setFormOpen] = useState(false);

  async function handleSubmit(values: { label: string; scoreEarned: number; scoreMax: number }) {
    await createPracticeEntry({ courseId, unitId, ...values });
  }

  if (entries.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Sparkles size={28} strokeWidth={1.5} aria-hidden="true" />}
          title="No practice scores yet"
          description="Practice scores help you gauge your own understanding — they never affect your official grade."
          action={
            <Button size="small" onClick={() => setFormOpen(true)}>
              Add practice score
            </Button>
          }
        />
        <PracticeEntryFormSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  return (
    <div className={styles.wrap}>
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
            <IconButton
              aria-label={`Delete ${entry.label}`}
              size="small"
              variant="ghost"
              onClick={() => deletePracticeEntry(entry.id)}
            >
              <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <Button size="small" variant="secondary" onClick={() => setFormOpen(true)}>
        Add practice score
      </Button>
      <PracticeEntryFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
