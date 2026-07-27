import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Select, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import type { GradeCategory } from "@/types/entities";
import styles from "./GradeCategoryFormSheet.module.css";

export interface GradeCategoryFormValues {
  name: string;
  maxPoints: number;
  parentCategoryId?: string;
}

export interface GradeCategoryFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** Only top-level categories are offered as a parent — nesting is one
   * level deep, matching DATA_MODEL.md's Coursework → Quizzes example. */
  topLevelCategories: GradeCategory[];
  onSubmit: (values: GradeCategoryFormValues) => Promise<void>;
}

/** Defines a course's Structured Mode category tree (PRODUCT_SPEC.md §10)
 * — e.g. "Coursework 60" at the top level, then "Quizzes 10" nested under
 * it. Adding the first category is what switches a course from Simple to
 * Structured Mode; existing uncategorized entries are never migrated or
 * lost by this. */
export function GradeCategoryFormSheet({
  open,
  onClose,
  topLevelCategories,
  onSubmit,
}: GradeCategoryFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title="Add category">
      {open && (
        <GradeCategoryFormBody
          topLevelCategories={topLevelCategories}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Overlay>
  );
}

function GradeCategoryFormBody({
  topLevelCategories,
  onClose,
  onSubmit,
}: {
  topLevelCategories: GradeCategory[];
  onClose: () => void;
  onSubmit: (values: GradeCategoryFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [maxPoints, setMaxPoints] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const max = Number(maxPoints);
    if (!name.trim()) {
      setError("A category name is required.");
      return;
    }
    if (!Number.isFinite(max) || max <= 0) {
      setError("Enter a max point value greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        maxPoints: max,
        parentCategoryId: parentCategoryId || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save this category locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Category name" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Coursework"
          />
        )}
      </Field>
      <Field label="Max points" required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="number"
            min={0}
            value={maxPoints}
            onChange={(e) => setMaxPoints(e.target.value)}
          />
        )}
      </Field>
      {topLevelCategories.length > 0 && (
        <Field
          label="Parent category"
          hint="Optional — nests this under an existing top-level category."
        >
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
            >
              <option value="">None (top-level)</option>
              {topLevelCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Button onClick={handleSubmit} loading={submitting}>
        Add category
      </Button>
    </div>
  );
}
