import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Field, Input } from "@/components";
import { createSemester } from "@/data/repositories/semesterRepository";
import styles from "./SemesterSetupScreen.module.css";

/**
 * First-run / re-entry gate (STAGE_1A_UX_ARCHITECTURE.md §O/§S). This is a
 * real, working write to the semester database — not a fixture — since
 * semester lifecycle is foundational persistence infrastructure, not a
 * Stage 3 domain feature. Saturday–Friday week mechanics are never
 * exposed here; it's an invisible system rule (PRODUCT_SPEC.md §15).
 */
export function SemesterSetupScreen() {
  const navigate = useNavigate();
  const [academicYear, setAcademicYear] = useState("");
  const [label, setLabel] = useState("");
  const [showDates, setShowDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!academicYear.trim() || !label.trim()) {
      setError("Academic year and semester label are required.");
      return;
    }
    setSubmitting(true);
    try {
      await createSemester({
        academicYear: academicYear.trim(),
        label: label.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      navigate("/home", { replace: true });
    } catch {
      setError("Couldn't save your semester locally. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Academic OS</p>
        <h1 className={styles.title}>Set up your semester</h1>
        <p className={styles.subtitle}>
          Just enough to get started — you can add courses, tasks, and schedule right after.
        </p>
        <form className={styles.form} onSubmit={handleSubmit}>
          <Field label="Academic year" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="Year 2"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
            )}
          </Field>
          <Field label="Semester" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="Semester 1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            )}
          </Field>

          {!showDates ? (
            <button type="button" className={styles.disclosure} onClick={() => setShowDates(true)}>
              + Add start/end dates (optional)
            </button>
          ) : (
            <div className={styles.dateRow}>
              <Field label="Start date">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                )}
              </Field>
              <Field label="End date">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                )}
              </Field>
            </div>
          )}

          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={submitting} className={styles.submit}>
            Start semester
          </Button>
        </form>
      </div>
    </div>
  );
}
