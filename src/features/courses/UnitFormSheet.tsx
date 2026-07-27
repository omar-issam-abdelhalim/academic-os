import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import type { Unit, UnitType } from "@/types/entities";
import styles from "./UnitFormSheet.module.css";

/** Approved default Unit Type suggestions (PRODUCT_SPEC.md §4) — a
 * convenience list, never a closed enum; a custom type is always just
 * typed into the same field. */
const UNIT_TYPE_SUGGESTIONS: UnitType[] = [
  "Lecture",
  "Tutorial",
  "Section",
  "Lab",
  "Video",
  "Chapter",
  "Assignment",
  "Workshop",
];

export interface UnitFormValues {
  title: string;
  type: UnitType;
}

export interface UnitFormSheetProps {
  open: boolean;
  onClose: () => void;
  unit?: Unit;
  onSubmit: (values: UnitFormValues) => Promise<void>;
}

export function UnitFormSheet({ open, onClose, unit, onSubmit }: UnitFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title={unit ? "Edit unit" : "Add unit"}>
      {open && (
        <UnitFormBody key={unit?.id ?? "new"} unit={unit} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Overlay>
  );
}

function UnitFormBody({
  unit,
  onClose,
  onSubmit,
}: {
  unit?: Unit;
  onClose: () => void;
  onSubmit: (values: UnitFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(unit?.title ?? "");
  const [type, setType] = useState<string>(unit?.type ?? "Lecture");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Unit title is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), type: (type.trim() || "Lecture") as UnitType });
      onClose();
    } catch {
      setError("Couldn't save this unit locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Unit title" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lecture 4 — Neural Networks"
          />
        )}
      </Field>
      <div>
        <p className={styles.typeLabel}>Type</p>
        <div className={styles.typeGrid}>
          {UNIT_TYPE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.typeChip}
              aria-pressed={type === suggestion}
              onClick={() => setType(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <Field label="Custom type" hint="Type your own — not limited to the suggestions above.">
          {(fieldProps) => (
            <Input {...fieldProps} value={type} onChange={(e) => setType(e.target.value)} />
          )}
        </Field>
      </div>
      <Button onClick={handleSubmit} loading={submitting}>
        {unit ? "Save changes" : "Add unit"}
      </Button>
    </div>
  );
}
