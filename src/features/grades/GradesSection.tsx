import { EmptyState, Button } from "@/components";
import {
  sumRecorded,
  summarizeCategory,
  topLevelCategories,
  childCategories,
} from "@/domain/gradeSummary";
import type { GradeCategory, GradeEntry } from "@/types/entities";
import styles from "./GradesSection.module.css";

export interface GradesSectionProps {
  categories: GradeCategory[];
  entries: GradeEntry[];
}

/**
 * Course Detail's Grades tab (STAGE_1A_UX_ARCHITECTURE.md §L). Mode is
 * emergent: no categories → Simple Mode (flat list); any category exists
 * → Structured Mode (nested rollups). Never fabricates certainty — gaps
 * are always shown as "not yet recorded/allocated," never zero.
 */
export function GradesSection({ categories, entries }: GradesSectionProps) {
  if (categories.length === 0 && entries.length === 0) {
    return (
      <EmptyState
        title="No grades yet"
        description="Add grades as they come in (Simple Mode), or define your course's category structure upfront (Structured Mode) — you can switch to structure later without losing anything."
        action={<Button size="small">Add grade</Button>}
      />
    );
  }

  if (categories.length === 0) {
    // Simple Mode
    const total = sumRecorded(entries);
    return (
      <div className={styles.section}>
        <div className={styles.totalCard}>
          <p className={styles.totalLabel}>Recorded so far</p>
          <p className={styles.totalValue}>
            <span className="numeric">{total.earned}</span>
            <span className={styles.totalSlash}>/</span>
            <span className="numeric">{total.max}</span>
          </p>
        </div>
        <ul className={styles.entryList}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entryRow}>
              <span>{e.label}</span>
              <span className="numeric">
                {e.scoreEarned}/{e.scoreMax}
              </span>
            </li>
          ))}
        </ul>
        <Button variant="secondary" size="small">
          Add course structure
        </Button>
      </div>
    );
  }

  // Structured Mode
  const tops = topLevelCategories(categories);
  const courseMax = tops.reduce((sum, c) => sum + c.maxPoints, 0);
  const allEntriesRecorded = sumRecorded(entries);
  const unassignedEntries = entries.filter((e) => !e.categoryId);

  return (
    <div className={styles.section}>
      <div className={styles.totalCard}>
        <p className={styles.totalLabel}>Course total</p>
        <p className={styles.totalValue}>
          <span className="numeric">{allEntriesRecorded.earned}</span>
          <span className={styles.totalSlash}>/</span>
          <span className="numeric">{courseMax}</span>
        </p>
      </div>

      {tops.map((top) => {
        const children = childCategories(categories, top.id);
        const topSummary = summarizeCategory(top, entries);
        return (
          <div key={top.id} className={styles.categoryBlock}>
            <div className={styles.categoryHeader}>
              <span>{top.name}</span>
              <span className="numeric">{top.maxPoints} pts</span>
            </div>
            {children.length > 0 ? (
              <ul className={styles.entryList}>
                {children.map((child) => {
                  const summary = summarizeCategory(child, entries);
                  return (
                    <li key={child.id} className={styles.entryRow}>
                      <span>{child.name}</span>
                      <span className={styles.categoryDetail}>
                        {summary.recorded.max > 0 ? (
                          <span className="numeric">
                            {summary.recorded.earned}/{summary.recorded.max}
                          </span>
                        ) : (
                          <span className={styles.pending}>not yet recorded</span>
                        )}
                        {summary.unallocated > 0 && (
                          <span className={styles.unallocated}>
                            {summary.unallocated} pts remaining
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.categoryDetail}>
                {topSummary.recorded.max > 0 ? (
                  <span className="numeric">
                    {topSummary.recorded.earned}/{topSummary.recorded.max} recorded
                  </span>
                ) : (
                  <span className={styles.pending}>not yet recorded</span>
                )}
              </p>
            )}
          </div>
        );
      })}

      {unassignedEntries.length > 0 && (
        <div className={styles.categoryBlock}>
          <div className={styles.categoryHeader}>
            <span>Unassigned entries</span>
          </div>
          <ul className={styles.entryList}>
            {unassignedEntries.map((e) => (
              <li key={e.id} className={styles.entryRow}>
                <span>{e.label}</span>
                <span className="numeric">
                  {e.scoreEarned}/{e.scoreMax}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
