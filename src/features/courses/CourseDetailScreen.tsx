import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ChevronRight, Clock, MapPin, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import {
  IconButton,
  SegmentedControl,
  TagChip,
  EmptyState,
  Menu,
  ConfirmationDialog,
} from "@/components";
import { TaskRow } from "@/features/shared/TaskRow";
import { useTasks } from "@/features/shared/useTasks";
import { GradesSection } from "@/features/grades/GradesSection";
import { PracticeSection } from "@/features/practice/PracticeSection";
import { CourseFormSheet } from "./CourseFormSheet";
import { UnitFormSheet } from "./UnitFormSheet";
import { ScheduleTemplateFormSheet } from "@/features/schedule/ScheduleTemplateFormSheet";
import { getCourse, updateCourse, deleteCourse } from "@/data/repositories/courseRepository";
import { listUnitsForCourse, createUnit } from "@/data/repositories/unitRepository";
import { listTags } from "@/data/repositories/tagRepository";
import {
  listTemplatesForCourse,
  createTemplate,
  deleteTemplate,
} from "@/data/repositories/scheduleRepository";
import {
  listCategoriesForCourse,
  listEntriesForCourse,
  listBoundariesForCourse,
} from "@/data/repositories/gradeRepository";
import { listPracticeForCourse } from "@/data/repositories/practiceRepository";
import { DAY_LABELS, bucketForDate } from "@/domain/academicWeek";
import styles from "./CourseDetailScreen.module.css";

type Section = "units" | "tasks" | "schedule" | "grades" | "practice";

const SECTIONS: { value: Section; label: string }[] = [
  { value: "units", label: "Units" },
  { value: "tasks", label: "Tasks" },
  { value: "schedule", label: "Schedule" },
  { value: "grades", label: "Grades" },
  { value: "practice", label: "Practice" },
];

/**
 * Course Detail (STAGE_1A_UX_ARCHITECTURE.md §H): header + default Units
 * body + a compact segmented control swapping content in place. Backed by
 * real repositories (Stage 3) — Units, Tasks, Schedule, Grades, and
 * Practice all read/write the same Dexie tables every other screen uses,
 * so changes here are reflected everywhere else immediately.
 */
export function CourseDetailScreen() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, toggle } = useTasks();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);

  const course = useLiveQuery(() => (courseId ? getCourse(courseId) : undefined), [courseId]);
  const tags = useLiveQuery(() => listTags(), []) ?? [];
  const units =
    useLiveQuery(() => (courseId ? listUnitsForCourse(courseId) : []), [courseId]) ?? [];
  const templates =
    useLiveQuery(() => (courseId ? listTemplatesForCourse(courseId) : []), [courseId]) ?? [];
  const categories =
    useLiveQuery(() => (courseId ? listCategoriesForCourse(courseId) : []), [courseId]) ?? [];
  const entries =
    useLiveQuery(() => (courseId ? listEntriesForCourse(courseId) : []), [courseId]) ?? [];
  const boundaries =
    useLiveQuery(() => (courseId ? listBoundariesForCourse(courseId) : []), [courseId]) ?? [];
  const practice =
    useLiveQuery(() => (courseId ? listPracticeForCourse(courseId) : []), [courseId]) ?? [];

  const section = (searchParams.get("section") as Section) || "units";

  if (course === undefined) return null;

  if (!course || !courseId) {
    return (
      <div>
        <ScreenHeader title="Course" back />
        <div className={styles.content}>
          <EmptyState title="Course not found" />
        </div>
      </div>
    );
  }

  const courseTasks = tasks.filter((t) => t.courseId === course.id);

  function setSection(next: Section) {
    setSearchParams(next === "units" ? {} : { section: next });
  }

  return (
    <div>
      <ScreenHeader
        title={course.name}
        back
        action={
          <div className={styles.menuAnchor}>
            <IconButton aria-label="Course options" onClick={() => setMenuOpen((o) => !o)}>
              <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
            </IconButton>
            <Menu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              align="end"
              label="Course options"
              items={[
                {
                  key: "edit",
                  label: "Edit course",
                  icon: <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />,
                  onSelect: () => setEditOpen(true),
                },
                {
                  key: "delete",
                  label: "Delete course",
                  icon: <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />,
                  onSelect: () => setDeleteOpen(true),
                },
              ]}
            />
          </div>
        }
      />
      <div className={styles.content}>
        <header className={styles.courseHeader}>
          <h2 className={styles.courseTitle}>{course.name}</h2>
          <p className={styles.courseMeta}>
            {[course.code, course.instructor].filter(Boolean).join(" · ")}
          </p>
          {course.description && <p className={styles.description}>{course.description}</p>}
          {course.tagIds.length > 0 && (
            <div className={styles.tags}>
              {course.tagIds.map((id) => {
                const tag = tags.find((t) => t.id === id);
                return tag ? <TagChip key={id} label={tag.name} color={tag.color} /> : null;
              })}
            </div>
          )}
        </header>

        <div className={styles.body}>
          <SegmentedControl
            options={SECTIONS}
            value={section}
            onChange={setSection}
            label="Course section"
          />

          <div className={styles.sectionBody}>
            {section === "units" && (
              <>
                <div className={styles.sectionToolbar}>
                  <IconButton aria-label="Add unit" onClick={() => setAddUnitOpen(true)}>
                    <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </div>
                {units.length === 0 ? (
                  <EmptyState
                    title="Add your first unit"
                    description="Units organize a course's content — lectures, tutorials, chapters, whatever fits."
                  />
                ) : (
                  <ul className={styles.unitList}>
                    {units.map((unit) => (
                      <li key={unit.id}>
                        <button
                          type="button"
                          className={styles.unitRow}
                          onClick={() => navigate(`/courses/${course.id}/units/${unit.id}`)}
                        >
                          <span className={styles.unitType}>{unit.type}</span>
                          <span className={styles.unitTitle}>{unit.title}</span>
                          <ChevronRight
                            size={16}
                            strokeWidth={1.5}
                            className={styles.chevron}
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {section === "tasks" && (
              <>
                <div className={styles.sectionToolbar}>
                  <IconButton
                    aria-label="Add task"
                    onClick={() => navigate(`/tasks?newTaskCourseId=${course.id}`)}
                  >
                    <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </div>
                {courseTasks.length === 0 ? (
                  <EmptyState title="No tasks for this course yet" />
                ) : (
                  <ul>
                    {courseTasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={{
                          id: t.id,
                          title: t.title,
                          completed: t.completed,
                          dueLabel: t.dueDate ? bucketForDate(new Date(t.dueDate)) : undefined,
                          overdue: t.dueDate
                            ? bucketForDate(new Date(t.dueDate)) === "overdue"
                            : false,
                        }}
                        onToggle={toggle}
                        onOpen={() => navigate("/tasks")}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}

            {section === "schedule" && (
              <>
                <div className={styles.sectionToolbar}>
                  <IconButton
                    aria-label="Add recurring class"
                    onClick={() => setAddClassOpen(true)}
                  >
                    <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                  </IconButton>
                </div>
                {templates.length === 0 ? (
                  <EmptyState title="No recurring classes for this course" />
                ) : (
                  <ul className={styles.templateList}>
                    {templates.map((tmpl) => (
                      <li key={tmpl.id} className={styles.templateRow}>
                        <span className={styles.templateType}>{tmpl.type}</span>
                        <span className={styles.templateDetail}>
                          {DAY_LABELS[tmpl.dayOfWeek]},{" "}
                          <span className="numeric">
                            {tmpl.startTime}–{tmpl.endTime}
                          </span>
                        </span>
                        {tmpl.location && (
                          <span className={styles.templateLocation}>
                            <MapPin size={13} strokeWidth={1.5} aria-hidden="true" />{" "}
                            {tmpl.location}
                          </span>
                        )}
                        <IconButton
                          aria-label={`Remove ${tmpl.type} class`}
                          size="small"
                          variant="ghost"
                          onClick={() => deleteTemplate(tmpl.id)}
                        >
                          <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                        </IconButton>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className={styles.viewAllLink}
                  onClick={() => navigate("/schedule")}
                >
                  <Clock size={14} strokeWidth={1.5} aria-hidden="true" /> View full schedule →
                </button>
              </>
            )}

            {section === "grades" && (
              <GradesSection
                courseId={course.id}
                categories={categories}
                entries={entries}
                boundaries={boundaries}
              />
            )}
            {section === "practice" && <PracticeSection courseId={course.id} entries={practice} />}
          </div>
        </div>
      </div>

      <CourseFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        course={course}
        tags={tags}
        onSubmit={async (values) => {
          await updateCourse(course.id, values);
        }}
      />

      <UnitFormSheet
        open={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        onSubmit={async (values) => {
          await createUnit({ courseId: course.id, ...values });
        }}
      />

      <ScheduleTemplateFormSheet
        open={addClassOpen}
        onClose={() => setAddClassOpen(false)}
        onSubmit={async (values) => {
          await createTemplate({ courseId: course.id, ...values });
        }}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteCourse(course.id);
          setDeleteOpen(false);
          navigate("/courses", { replace: true });
        }}
        title={`Delete "${course.name}"?`}
        description="This permanently deletes this course's units, content, tasks, schedule, grades, and practice scores. This cannot be undone."
        confirmLabel="Delete course"
        destructive
      />
    </div>
  );
}
