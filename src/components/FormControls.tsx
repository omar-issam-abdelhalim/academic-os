import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/classNames";
import styles from "./FormControls.module.css";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (fieldProps: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}

/** Associates a label + optional hint/error with a control via generated
 * ids — STAGE_1A_UX_ARCHITECTURE.md §U: form errors must be programmatically
 * associated with their field, not color/border alone. */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(styles.control, className)} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea ref={ref} className={cn(styles.control, styles.textarea, className)} {...rest} />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(styles.control, styles.select, className)} {...rest}>
        {children}
      </select>
    );
  },
);

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  id?: string;
}

export function Checkbox({ checked, onChange, label, hideLabel, id }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <span className={styles.checkboxWrap}>
      <input
        id={inputId}
        type="checkbox"
        className={styles.checkboxInput}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={inputId} className={hideLabel ? "visually-hidden" : styles.checkboxLabel}>
        {label}
      </label>
    </span>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
}

export function Toggle({ checked, onChange, label, hideLabel }: ToggleProps) {
  return (
    <label className={styles.toggleWrap}>
      <span className={hideLabel ? "visually-hidden" : styles.toggleLabel}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        className={cn(styles.toggle, checked && styles.toggleOn)}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.toggleThumb} />
      </button>
    </label>
  );
}
