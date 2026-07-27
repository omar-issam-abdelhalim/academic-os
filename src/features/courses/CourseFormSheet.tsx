import { useRef, useState, useEffect } from "react";
import { Dialog, Sheet, Field, Input, Textarea, TagChip, Button } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import type { Course, Tag } from "@/types/entities";
import styles from "./CourseFormSheet.module.css";

export interface CourseFormValues {
  name: string;
  code?: string;
  instructor?: string;
  description?: string;
  tagIds: string[];
}

export interface CourseFormSheetProps {
  open: boolean;
  onClose: () => void;
  course?: Course;
  tags: Tag[];
  onSubmit: (values: CourseFormValues) => Promise<void>;
}

/**
 * Course create/edit form (PRODUCT_SPEC.md §3): only `name` is required —
 * code is intentionally never mandatory, since many non-university
 * learning sources have no course code. Shared between "Add course"
 * (CoursesScreen) and "Edit course" (CourseDetailScreen) so the two flows
 * can never drift apart.
 *
 * Split into a shell (always mounted, owns the Overlay) + a body (mounted
 * only while `open`) so the body's form fields simply initialize from
 * `course` at mount time — no reset-on-open effect needed.
 */
export function CourseFormSheet({ open, onClose, course, tags, onSubmit }: CourseFormSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  return (
    <Overlay open={open} onClose={onClose} title={course ? "Edit course" : "Add course"}>
      {open && (
        <CourseFormBody
          key={course?.id ?? "new"}
          course={course}
          tags={tags}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Overlay>
  );
}

function CourseFormBody({
  course,
  tags,
  onClose,
  onSubmit,
}: {
  course?: Course;
  tags: Tag[];
  onClose: () => void;
  onSubmit: (values: CourseFormValues) => Promise<void>;
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [instructor, setInstructor] = useState(course?.instructor ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [tagIds, setTagIds] = useState<Set<string>>(new Set(course?.tagIds ?? []));
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  function toggleTag(id: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Course name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        code: code.trim() || undefined,
        instructor: instructor.trim() || undefined,
        description: description.trim() || undefined,
        tagIds: [...tagIds],
      });
      onClose();
    } catch {
      setError("Couldn't save this course locally. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Course name" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. CSAI 101, or Machine Learning Specialization"
          />
        )}
      </Field>
      <Field
        label="Course code"
        hint="Optional — many self-study or online courses don't have one."
      >
        {(fieldProps) => (
          <Input {...fieldProps} value={code} onChange={(e) => setCode(e.target.value)} />
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
      <Field label="Description">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        )}
      </Field>
      {tags.length > 0 && (
        <div>
          <p className={styles.tagsLabel}>Tags</p>
          <div className={styles.tagGrid}>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={styles.tagButton}
                aria-pressed={tagIds.has(tag.id)}
                onClick={() => toggleTag(tag.id)}
              >
                <TagChip label={tag.name} color={tag.color} />
              </button>
            ))}
          </div>
        </div>
      )}
      <Button onClick={handleSubmit} loading={submitting}>
        {course ? "Save changes" : "Add course"}
      </Button>
    </div>
  );
}
