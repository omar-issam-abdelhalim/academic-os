import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, IconButton, TagChip, EmptyState } from "@/components";
import { listCourses, createCourse } from "@/data/repositories/courseRepository";
import { listTags } from "@/data/repositories/tagRepository";
import { semesterDb } from "@/data/db";
import { CourseFormSheet } from "./CourseFormSheet";
import styles from "./CoursesScreen.module.css";

/**
 * Courses list (STAGE_1A_UX_ARCHITECTURE.md §E/§P). Collapsed-by-default
 * tag filter row — never permanent vertical space when unused. Handles
 * long names, multiple tags, and courses with no code/instructor (never
 * assuming every course is a university course). Backed by real
 * `courseRepository`/`tagRepository` data (Stage 3) — no fixtures.
 */
export function CoursesScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTagIds, setActiveTagIds] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  // Command palette's "Add course" quick-add navigates here with
  // `?new=1` — derived directly during render (no effect needed) so the
  // sheet opens on the very first render after navigation, not one tick
  // later.
  const openFromQuery = searchParams.get("new") === "1";

  const courses = useLiveQuery(() => listCourses(), []);
  const tags = useLiveQuery(() => listTags(), []);
  // Unit counts are read directly rather than per-course repository calls
  // so the list renders from one live query, not N.
  const units = useLiveQuery(() => semesterDb.units.toArray(), []);

  const unitCountByCourse = useMemo(() => {
    const map = new Map<string, number>();
    for (const unit of units ?? []) {
      map.set(unit.courseId, (map.get(unit.courseId) ?? 0) + 1);
    }
    return map;
  }, [units]);

  const usedTagIds = useMemo(() => new Set((courses ?? []).flatMap((c) => c.tagIds)), [courses]);
  const filterableTags = (tags ?? []).filter((t) => usedTagIds.has(t.id));
  const tagById = useMemo(() => new Map((tags ?? []).map((t) => [t.id, t])), [tags]);

  const visibleCourses = (courses ?? []).filter(
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

  const loading = courses === undefined;

  return (
    <div>
      <ScreenHeader
        title="Courses"
        action={
          <IconButton aria-label="Add course" onClick={() => setAddOpen(true)}>
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

        {!loading && visibleCourses.length === 0 ? (
          <EmptyState
            title="Add your first course"
            description="Courses can be university lectures, YouTube series, or self-study — whatever you're learning."
            action={
              <Button size="small" onClick={() => setAddOpen(true)}>
                Add a course
              </Button>
            }
          />
        ) : (
          <ul className={styles.list}>
            {visibleCourses.map((course) => {
              const unitCount = unitCountByCourse.get(course.id) ?? 0;
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
                            const tag = tagById.get(id);
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

      <CourseFormSheet
        open={addOpen || openFromQuery}
        onClose={() => {
          setAddOpen(false);
          if (openFromQuery) setSearchParams({});
        }}
        tags={tags ?? []}
        onSubmit={async (values) => {
          const created = await createCourse(values);
          navigate(`/courses/${created.id}`);
        }}
      />
    </div>
  );
}
