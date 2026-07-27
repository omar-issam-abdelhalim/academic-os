import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import styles from "./PracticeEntryFormSheet.module.css";

export interface PracticeEntryFormValues {
  label: string;
  scoreEarned: number;
  scoreMax: number;
}

export interface PracticeEntryFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: PracticeEntryFormValues) => Promise<void>;
}

/** Practice scores are structurally distinct from grades (PRODUCT_SPEC.md
 * §12) — this form never touches gradeRepository. */
export function PracticeEntryFormSheet({ open, onClose, onSubmit }: PracticeEntryFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title="Add practice score">
      {open && <PracticeEntryFormBody onClose={onClose} onSubmit={onSubmit} />}
    </Overlay>
  );
}

function PracticeEntryFormBody({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (values: PracticeEntryFormValues) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [scoreEarned, setScoreEarned] = useState("");
  const [scoreMax, setScoreMax] = useState("");
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
      setError("A label is required (e.g. 'Tutorial Practice').");
      return;
    }
    if (!Number.isFinite(earned) || !Number.isFinite(max) || max <= 0 || earned < 0) {
      setError("Enter a valid earned score and a max score greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ label: label.trim(), scoreEarned: earned, scoreMax: max });
      onClose();
    } catch {
      setError("Couldn't save this practice score locally. Please try again.");
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
            placeholder="e.g. Tutorial Practice"
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
      <Button onClick={handleSubmit} loading={submitting}>
        Add practice score
      </Button>
    </div>
  );
}
