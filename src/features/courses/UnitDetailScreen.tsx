import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { IconButton, EmptyState } from "@/components";
import { TaskRow } from "@/features/shared/TaskRow";
import { useFixtureTasks } from "@/features/shared/useFixtureTasks";
import { PracticeSection } from "@/features/practice/PracticeSection";
import { ContentBlockCard } from "./ContentBlockCard";
import { AddContentSheet } from "./AddContentSheet";
import { unitById, courseById, contentBlocksForUnit, fixturePracticeEntries } from "@/fixtures";
import { bucketForDate } from "@/domain/academicWeek";
import { cn } from "@/lib/classNames";
import styles from "./UnitDetailScreen.module.css";

/**
 * Unit Detail (STAGE_1A_UX_ARCHITECTURE.md §I) — the learning-workspace
 * concept: Content Blocks (default open), Tasks (collapsible), Practice
 * (collapsible, visually distinct from anything grade-related).
 */
export function UnitDetailScreen() {
  const { courseId, unitId } = useParams<{ courseId: string; unitId: string }>();
  const navigate = useNavigate();
  const { tasks, toggle } = useFixtureTasks();
  const [addOpen, setAddOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(true);

  const unit = unitId ? unitById(unitId) : undefined;
  const course = courseId ? courseById(courseId) : undefined;

  if (!unit || !course) {
    return (
      <div>
        <ScreenHeader title="Unit" back />
        <div className={styles.content}>
          <EmptyState title="Unit not found" />
        </div>
      </div>
    );
  }

  const blocks = contentBlocksForUnit(unit.id);
  const unitTasks = tasks.filter((t) => t.unitId === unit.id);
  const unitPractice = fixturePracticeEntries.filter((p) => p.unitId === unit.id);

  return (
    <div>
      <ScreenHeader title={course.name} back />
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.typeBadge}>{unit.type}</span>
          <h2 className={styles.title}>{unit.title}</h2>
        </header>

        <section aria-label="Content blocks" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Content</h3>
            <IconButton aria-label="Add content" onClick={() => setAddOpen(true)}>
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
            </IconButton>
          </div>
          {blocks.length === 0 ? (
            <EmptyState
              title="Add your first content block"
              description="Slides, notes, images, or a video — however you want to build this unit."
            />
          ) : (
            <div className={styles.blockList}>
              {blocks.map((block) => (
                <ContentBlockCard key={block.id} block={block} />
              ))}
            </div>
          )}
        </section>

        <section aria-label="Unit tasks" className={styles.section}>
          <button
            type="button"
            className={styles.collapsibleHeader}
            onClick={() => setTasksOpen((o) => !o)}
          >
            {tasksOpen ? (
              <ChevronDown size={16} aria-hidden="true" />
            ) : (
              <ChevronRight size={16} aria-hidden="true" />
            )}
            <h3 className={styles.sectionTitle}>Tasks ({unitTasks.length})</h3>
          </button>
          {tasksOpen && (
            <div className={cn(unitTasks.length === 0 && styles.emptyInline)}>
              {unitTasks.length === 0 ? (
                <p className={styles.mutedInline}>No tasks for this unit yet.</p>
              ) : (
                <ul>
                  {unitTasks.map((t) => (
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
            </div>
          )}
        </section>

        <section aria-label="Practice" className={styles.section}>
          <button
            type="button"
            className={styles.collapsibleHeader}
            onClick={() => setPracticeOpen((o) => !o)}
          >
            {practiceOpen ? (
              <ChevronDown size={16} aria-hidden="true" />
            ) : (
              <ChevronRight size={16} aria-hidden="true" />
            )}
            <h3 className={styles.sectionTitle}>Practice ({unitPractice.length})</h3>
          </button>
          {practiceOpen && <PracticeSection entries={unitPractice} />}
        </section>
      </div>

      <AddContentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onChoose={() => setAddOpen(false)}
      />
    </div>
  );
}
