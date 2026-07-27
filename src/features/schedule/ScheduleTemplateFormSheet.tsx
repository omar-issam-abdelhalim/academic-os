import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Select, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { DAY_LABELS } from "@/domain/academicWeek";
import type { ScheduleTemplate } from "@/types/entities";
import styles from "./ScheduleTemplateFormSheet.module.css";

const TYPE_SUGGESTIONS = ["Lecture", "Tutorial", "Section", "Lab"];

export interface ScheduleTemplateFormValues {
  type: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  location?: string;
  instructor?: string;
}

export interface ScheduleTemplateFormSheetProps {
  open: boolean;
  onClose: () => void;
  template?: ScheduleTemplate;
  onSubmit: (values: ScheduleTemplateFormValues) => Promise<void>;
}

/** Recurring weekly-class template (PRODUCT_SPEC.md §7) — editing this
 * only changes the pattern going forward; it never rewrites past
 * ScheduleOccurrence snapshots (DATA_MODEL.md). */
export function ScheduleTemplateFormSheet({
  open,
  onClose,
  template,
  onSubmit,
}: ScheduleTemplateFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title={template ? "Edit class" : "Add recurring class"}>
      {open && (
        <ScheduleTemplateFormBody
          key={template?.id ?? "new"}
          template={template}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Overlay>
  );
}

function ScheduleTemplateFormBody({
  template,
  onClose,
  onSubmit,
}: {
  template?: ScheduleTemplate;
  onClose: () => void;
  onSubmit: (values: ScheduleTemplateFormValues) => Promise<void>;
}) {
  const [type, setType] = useState(template?.type ?? "Lecture");
  const [dayOfWeek, setDayOfWeek] = useState<number>(template?.dayOfWeek ?? 0);
  const [startTime, setStartTime] = useState(template?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(template?.endTime ?? "10:30");
  const [location, setLocation] = useState(template?.location ?? "");
  const [instructor, setInstructor] = useState(template?.instructor ?? "");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const typeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    typeInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!type.trim()) {
      setError("Class type is required.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        type: type.trim(),
        dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        startTime,
        endTime,
        location: location.trim() || undefined,
        instructor: instructor.trim() || undefined,
      });
      onClose();
    } catch {
      setError("Couldn't save this class locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <div>
        <p className={styles.label}>Type</p>
        <div className={styles.chipRow}>
          {TYPE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.chip}
              aria-pressed={type === suggestion}
              onClick={() => setType(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
        <Field label="Custom type">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              ref={typeInputRef}
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Day" required>
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
          >
            {DAY_LABELS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div className={styles.timeRow}>
        <Field label="Start time" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          )}
        </Field>
        <Field label="End time" required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Location">
        {(fieldProps) => (
          <Input {...fieldProps} value={location} onChange={(e) => setLocation(e.target.value)} />
        )}
      </Field>
      <Field label="Instructor">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
          />
        )}
      </Field>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <Button onClick={handleSubmit} loading={submitting}>
        {template ? "Save changes" : "Add class"}
      </Button>
    </div>
  );
}
