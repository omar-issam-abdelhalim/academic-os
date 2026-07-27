import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Select, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import type { GradeCategory } from "@/types/entities";
import styles from "./GradeEntryFormSheet.module.css";

export interface GradeEntryFormValues {
  label: string;
  scoreEarned: number;
  scoreMax: number;
  categoryId?: string;
}

export interface GradeEntryFormSheetProps {
  open: boolean;
  onClose: () => void;
  categories: GradeCategory[];
  onSubmit: (values: GradeEntryFormValues) => Promise<void>;
}

/** Records a single result as it comes in (PRODUCT_SPEC.md §10) —
 * assignable to a category (Structured Mode) or left unassigned (Simple
 * Mode / not-yet-categorized). */
export function GradeEntryFormSheet({
  open,
  onClose,
  categories,
  onSubmit,
}: GradeEntryFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title="Add grade">
      {open && <GradeEntryFormBody categories={categories} onClose={onClose} onSubmit={onSubmit} />}
    </Overlay>
  );
}

function GradeEntryFormBody({
  categories,
  onClose,
  onSubmit,
}: {
  categories: GradeCategory[];
  onClose: () => void;
  onSubmit: (values: GradeEntryFormValues) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [scoreEarned, setScoreEarned] = useState("");
  const [scoreMax, setScoreMax] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const earned = Number(scoreEarned);
    const max = Number(scoreMax);
    if (!label.trim()) {
      setError("A label is required (e.g. 'Quiz 1').");
      return;
    }
    if (!Number.isFinite(earned) || !Number.isFinite(max) || max <= 0 || earned < 0) {
      setError("Enter a valid earned score and a max score greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        label: label.trim(),
        scoreEarned: earned,
        scoreMax: max,
        categoryId: categoryId || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save this grade locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Label" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={labelInputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Quiz 1"
          />
        )}
      </Field>
      <div className={styles.scoreRow}>
        <Field label="Earned" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={0}
              value={scoreEarned}
              onChange={(e) => setScoreEarned(e.target.value)}
            />
          )}
        </Field>
        <Field label="Out of" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              min={0}
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
            />
          )}
        </Field>
      </div>
      {categories.length > 0 && (
        <Field label="Category" hint="Optional — leave unassigned to record it without a category.">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Button onClick={handleSubmit} loading={submitting}>
        Add grade
      </Button>
    </div>
  );
}
