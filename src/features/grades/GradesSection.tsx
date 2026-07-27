import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EmptyState, Button, IconButton } from "@/components";
import {
  sumRecorded,
  summarizeCategory,
  topLevelCategories,
  childCategories,
  currentPerformancePercent,
  boundaryForPercent,
} from "@/domain/gradeSummary";
import {
  createGradeEntry,
  deleteGradeEntry,
  createCategory,
  deleteCategory,
} from "@/data/repositories/gradeRepository";
import { GradeEntryFormSheet } from "./GradeEntryFormSheet";
import { GradeCategoryFormSheet } from "./GradeCategoryFormSheet";
import type { GradeBoundary, GradeCategory, GradeEntry } from "@/types/entities";
import styles from "./GradesSection.module.css";

export interface GradesSectionProps {
  courseId: string;
  categories: GradeCategory[];
  entries: GradeEntry[];
  boundaries: GradeBoundary[];
}

/**
 * Course Detail's Grades tab (STAGE_1A_UX_ARCHITECTURE.md §L). Mode is
 * emergent: no categories → Simple Mode (flat list); any category exists
 * → Structured Mode (nested rollups). Never fabricates certainty — gaps
 * are always shown as "not yet recorded/allocated," never zero. Backed by
 * real `gradeRepository` data (Stage 3).
 */
export function GradesSection({ courseId, categories, entries, boundaries }: GradesSectionProps) {
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);

  const tops = topLevelCategories(categories);
  const recorded = sumRecorded(entries);
  const percent = currentPerformancePercent(recorded);
  const boundary = percent !== undefined ? boundaryForPercent(boundaries, percent) : undefined;

  const performanceLine =
    percent !== undefined ? (
      <p className={styles.performanceLine}>
        Current performance: <span className="numeric">{percent.toFixed(1)}%</span>
        {boundary && ` (${boundary.label})`}
      </p>
    ) : null;

  if (categories.length === 0 && entries.length === 0) {
    return (
      <>
        <EmptyState
          title="No grades yet"
          description="Add grades as they come in (Simple Mode), or define your course's category structure upfront (Structured Mode) — you can switch to structure later without losing anything."
          action={
            <div className={styles.actionStack}>
              <Button size="small" onClick={() => setEntryFormOpen(true)}>
                Add grade
              </Button>
              <Button size="small" variant="secondary" onClick={() => setCategoryFormOpen(true)}>
                Add course structure
              </Button>
            </div>
          }
        />
        <GradeEntryFormSheet
          open={entryFormOpen}
          onClose={() => setEntryFormOpen(false)}
          categories={categories}
          onSubmit={(values) => createGradeEntry({ courseId, ...values }).then(() => undefined)}
        />
        <GradeCategoryFormSheet
          open={categoryFormOpen}
          onClose={() => setCategoryFormOpen(false)}
          topLevelCategories={tops}
          onSubmit={(values) => createCategory({ courseId, ...values }).then(() => undefined)}
        />
      </>
    );
  }

  if (categories.length === 0) {
    // Simple Mode
    return (
      <div className={styles.section}>
        <div className={styles.totalCard}>
          <p className={styles.totalLabel}>Recorded so far</p>
          <p className={styles.totalValue}>
            <span className="numeric">{recorded.earned}</span>
            <span className={styles.totalSlash}>/</span>
            <span className="numeric">{recorded.max}</span>
          </p>
          {performanceLine}
        </div>
        <ul className={styles.entryList}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entryRow}>
              <span>{e.label}</span>
              <span className={styles.entryRight}>
                <span className="numeric">
                  {e.scoreEarned}/{e.scoreMax}
                </span>
                <IconButton
                  aria-label={`Delete ${e.label}`}
                  size="small"
                  variant="ghost"
                  onClick={() => deleteGradeEntry(e.id)}
                >
                  <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.actionStack}>
          <Button size="small" onClick={() => setEntryFormOpen(true)}>
            Add grade
          </Button>
          <Button variant="secondary" size="small" onClick={() => setCategoryFormOpen(true)}>
            Add course structure
          </Button>
        </div>
        <GradeEntryFormSheet
          open={entryFormOpen}
          onClose={() => setEntryFormOpen(false)}
          categories={categories}
          onSubmit={(values) => createGradeEntry({ courseId, ...values }).then(() => undefined)}
        />
        <GradeCategoryFormSheet
          open={categoryFormOpen}
          onClose={() => setCategoryFormOpen(false)}
          topLevelCategories={tops}
          onSubmit={(values) => createCategory({ courseId, ...values }).then(() => undefined)}
        />
      </div>
    );
  }

  // Structured Mode
  const courseMax = tops.reduce((sum, c) => sum + c.maxPoints, 0);
  const unassignedEntries = entries.filter((e) => !e.categoryId);

  return (
    <div className={styles.section}>
      <div className={styles.totalCard}>
        <p className={styles.totalLabel}>Course total</p>
        <p className={styles.totalValue}>
          <span className="numeric">{recorded.earned}</span>
          <span className={styles.totalSlash}>/</span>
          <span className="numeric">{courseMax}</span>
        </p>
        {performanceLine}
      </div>

      {tops.map((top) => {
        const children = childCategories(categories, top.id);
        const topSummary = summarizeCategory(top, entries);
        return (
          <div key={top.id} className={styles.categoryBlock}>
            <div className={styles.categoryHeader}>
              <span>{top.name}</span>
              <span className={styles.categoryHeaderRight}>
                <span className="numeric">{top.maxPoints} pts</span>
                <IconButton
                  aria-label={`Delete ${top.name} category`}
                  size="small"
                  variant="ghost"
                  onClick={() => deleteCategory(top.id)}
                >
                  <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
              </span>
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
                <span className={styles.entryRight}>
                  <span className="numeric">
                    {e.scoreEarned}/{e.scoreMax}
                  </span>
                  <IconButton
                    aria-label={`Delete ${e.label}`}
                    size="small"
                    variant="ghost"
                    onClick={() => deleteGradeEntry(e.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actionStack}>
        <Button size="small" onClick={() => setEntryFormOpen(true)}>
          Add grade
        </Button>
        <Button variant="secondary" size="small" onClick={() => setCategoryFormOpen(true)}>
          Add category
        </Button>
      </div>

      <GradeEntryFormSheet
        open={entryFormOpen}
        onClose={() => setEntryFormOpen(false)}
        categories={categories}
        onSubmit={(values) => createGradeEntry({ courseId, ...values }).then(() => undefined)}
      />
      <GradeCategoryFormSheet
        open={categoryFormOpen}
        onClose={() => setCategoryFormOpen(false)}
        topLevelCategories={tops}
        onSubmit={(values) => createCategory({ courseId, ...values }).then(() => undefined)}
      />
    </div>
  );
}
