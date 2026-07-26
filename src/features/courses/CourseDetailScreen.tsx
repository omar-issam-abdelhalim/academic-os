import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, ChevronRight, Clock, MapPin } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { IconButton, SegmentedControl, TagChip, EmptyState, StatusBadge } from "@/components";
import { TaskRow } from "@/features/shared/TaskRow";
import { useFixtureTasks } from "@/features/shared/useFixtureTasks";
import { GradesSection } from "@/features/grades/GradesSection";
import { PracticeSection } from "@/features/practice/PracticeSection";
import {
  courseById,
  unitsForCourse,
  tagById,
  fixtureGradeCategories,
  fixtureGradeEntries,
  fixturePracticeEntries,
  fixtureScheduleTemplates,
} from "@/fixtures";
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
 * body + a compact segmented control swapping content in place — never a
 * full 6-tab bar, never a full-page navigation away from the header.
 */
export function CourseDetailScreen() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tasks, toggle } = useFixtureTasks();
  const [message, setMessage] = useState<string | null>(null);

  const course = courseId ? courseById(courseId) : undefined;
  const section = (searchParams.get("section") as Section) || "units";

  if (!course) {
    return (
      <div>
        <ScreenHeader title="Course" back />
        <div className={styles.content}>
          <EmptyState title="Course not found" />
        </div>
      </div>
    );
  }

  const units = unitsForCourse(course.id);
  const courseTasks = tasks.filter((t) => t.courseId === course.id);
  const courseTemplates = fixtureScheduleTemplates.filter((s) => s.courseId === course.id);
  const courseCategories = fixtureGradeCategories.filter((c) => c.courseId === course.id);
  const courseEntries = fixtureGradeEntries.filter((e) => e.courseId === course.id);
  const coursePractice = fixturePracticeEntries.filter((p) => p.courseId === course.id);

  function setSection(next: Section) {
    setSearchParams(next === "units" ? {} : { section: next });
  }

  return (
    <div>
      <ScreenHeader title={course.name} back />
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
                const tag = tagById(id);
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
                  {message && <StatusBadge tone="info">{message}</StatusBadge>}
                  <IconButton
                    aria-label="Add unit"
                    onClick={() =>
                      setMessage(
                        "Creating units arrives in Stage 3 — this button is a reference placeholder for now.",
                      )
                    }
                  >
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
                {courseTemplates.length === 0 ? (
                  <EmptyState title="No recurring classes for this course" />
                ) : (
                  <ul className={styles.templateList}>
                    {courseTemplates.map((tmpl) => (
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
              <GradesSection categories={courseCategories} entries={courseEntries} />
            )}
            {section === "practice" && <PracticeSection entries={coursePractice} />}
          </div>
        </div>
      </div>
    </div>
  );
}
