/**
 * Minimal display-aggregation helpers for the Grades reference UI. This is
 * intentionally *not* the full grade-calculation engine described in
 * PRODUCT_SPEC.md §11 (required score to pass, max possible final, etc.)
 * — that is explicit Stage 5 scope. This module only sums what's already
 * recorded, which the reference screens need to render honestly (never
 * treating an unrecorded entry/category as zero).
 */
import type { GradeCategory, GradeEntry } from "@/types/entities";

export interface RecordedTotal {
  earned: number;
  max: number;
}

/** Sums earned/max across entries — used for both Simple Mode's flat total
 * and a single category's recorded total. */
export function sumRecorded(entries: GradeEntry[]): RecordedTotal {
  return entries.reduce(
    (acc, e) => ({ earned: acc.earned + e.scoreEarned, max: acc.max + e.scoreMax }),
    { earned: 0, max: 0 },
  );
}

export interface CategorySummary {
  category: GradeCategory;
  recorded: RecordedTotal;
  /** Points in this category's declared max that no entry accounts for
   * yet — never rendered as zero, always as "not yet allocated." */
  unallocated: number;
}

export function summarizeCategory(category: GradeCategory, entries: GradeEntry[]): CategorySummary {
  const own = entries.filter((e) => e.categoryId === category.id);
  const recorded = sumRecorded(own);
  return { category, recorded, unallocated: Math.max(category.maxPoints - recorded.max, 0) };
}

/** Top-level categories only (no parentCategoryId) — used to build the
 * course-total "N pts not yet allocated" line described in
 * STAGE_1A_UX_ARCHITECTURE.md §L. */
export function topLevelCategories(categories: GradeCategory[]): GradeCategory[] {
  return categories.filter((c) => !c.parentCategoryId);
}

export function childCategories(categories: GradeCategory[], parentId: string): GradeCategory[] {
  return categories.filter((c) => c.parentCategoryId === parentId);
}
