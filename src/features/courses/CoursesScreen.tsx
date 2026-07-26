import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { IconButton, TagChip, EmptyState } from "@/components";
import { fixtureCourses, fixtureTags, tagById, unitsForCourse } from "@/fixtures";
import styles from "./CoursesScreen.module.css";

/**
 * Courses list (STAGE_1A_UX_ARCHITECTURE.md §E/§P). Collapsed-by-default
 * tag filter row — never permanent vertical space when unused. Handles
 * long names, multiple tags, and courses with no code/instructor (never
 * assuming every course is a university course).
 */
export function CoursesScreen() {
  const navigate = useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set());

  const usedTagIds = useMemo(() => new Set(fixtureCourses.flatMap((c) => c.tagIds)), []);
  const filterableTags = fixtureTags.filter((t) => usedTagIds.has(t.id));

  const courses = fixtureCourses.filter(
    (c) => activeTagIds.size === 0 || c.tagIds.some((id) => activeTagIds.has(id)),
  );

  function toggleTagFilter(id: string) {
    setActiveTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <ScreenHeader
        title="Courses"
        action={
          <IconButton aria-label="Add course">
            <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        }
      />
      <div className={styles.content}>
        {filterableTags.length > 0 && (
          <div className={styles.filterRow}>
            <button
              type="button"
              className={styles.filterToggle}
              onClick={() => setFilterOpen((o) => !o)}
            >
              Filter by tag {activeTagIds.size > 0 && `(${activeTagIds.size})`}
            </button>
            {filterOpen && (
              <div className={styles.filterChips}>
                {filterableTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    className={styles.filterChipButton}
                    aria-pressed={activeTagIds.has(tag.id)}
                    onClick={() => toggleTagFilter(tag.id)}
                  >
                    <TagChip label={tag.name} color={tag.color} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {courses.length === 0 ? (
          <EmptyState
            title="Add your first course"
            description="Courses can be university lectures, YouTube series, or self-study — whatever you're learning."
          />
        ) : (
          <ul className={styles.list}>
            {courses.map((course) => {
              const unitCount = unitsForCourse(course.id).length;
              return (
                <li key={course.id}>
                  <button
                    type="button"
                    className={styles.row}
                    onClick={() => navigate(`/courses/${course.id}`)}
                  >
                    <div className={styles.rowMain}>
                      <p className={styles.courseName}>{course.name}</p>
                      <p className={styles.courseMeta}>
                        {[course.code, course.instructor].filter(Boolean).join(" · ") ||
                          `${unitCount} unit${unitCount === 1 ? "" : "s"}`}
                      </p>
                      {course.tagIds.length > 0 && (
                        <div className={styles.tags}>
                          {course.tagIds.map((id) => {
                            const tag = tagById(id);
                            return tag ? (
                              <TagChip key={id} label={tag.name} color={tag.color} />
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={18}
                      strokeWidth={1.5}
                      className={styles.chevron}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
