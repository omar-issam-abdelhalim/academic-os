import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { IconButton, EmptyState, Menu, ConfirmationDialog } from "@/components";
import { TaskRow } from "@/features/shared/TaskRow";
import { useTasks } from "@/features/shared/useTasks";
import { PracticeSection } from "@/features/practice/PracticeSection";
import { ContentBlockCard } from "./ContentBlockCard";
import { AddContentSheet } from "./AddContentSheet";
import { ContentBlockComposer, type ComposableBlockType } from "./ContentBlockComposer";
import { UnitFormSheet } from "./UnitFormSheet";
import { getUnit, updateUnit, deleteUnit } from "@/data/repositories/unitRepository";
import { getCourse } from "@/data/repositories/courseRepository";
import { listBlocksForUnit, deleteBlock } from "@/data/repositories/contentBlockRepository";
import { listPracticeForUnit } from "@/data/repositories/practiceRepository";
import { bucketForDate } from "@/domain/academicWeek";
import { cn } from "@/lib/classNames";
import type { ContentBlock } from "@/types/entities";
import styles from "./UnitDetailScreen.module.css";

/**
 * Unit Detail (STAGE_1A_UX_ARCHITECTURE.md §I) — the learning-workspace
 * concept: Content Blocks (default open), Tasks (collapsible), Practice
 * (collapsible, visually distinct from anything grade-related). Backed by
 * real repositories (Stage 3).
 */
export function UnitDetailScreen() {
  const { courseId, unitId } = useParams<{ courseId: string; unitId: string }>();
  const navigate = useNavigate();
  const { tasks, toggle } = useTasks();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerType, setComposerType] = useState<ComposableBlockType | null>(null);
  const [editingBlock, setEditingBlock] = useState<
    Extract<ContentBlock, { type: "text" }> | undefined
  >();
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<ContentBlock | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [deleteUnitOpen, setDeleteUnitOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(true);

  const unit = useLiveQuery(() => (unitId ? getUnit(unitId) : undefined), [unitId]);
  const course = useLiveQuery(() => (courseId ? getCourse(courseId) : undefined), [courseId]);
  const blocks = useLiveQuery(() => (unitId ? listBlocksForUnit(unitId) : []), [unitId]) ?? [];
  const unitPractice =
    useLiveQuery(() => (unitId ? listPracticeForUnit(unitId) : []), [unitId]) ?? [];

  if (unit === undefined || course === undefined) return null;

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

  const unitTasks = tasks.filter((t) => t.unitId === unit.id);

  function openComposer(type: ComposableBlockType) {
    setPickerOpen(false);
    setEditingBlock(undefined);
    setComposerType(type);
  }

  function openEditText(block: ContentBlock) {
    if (block.type !== "text") return;
    setEditingBlock(block);
    setComposerType("text");
  }

  return (
    <div>
      <ScreenHeader
        title={course.name}
        back
        action={
          <div className={styles.menuAnchor}>
            <IconButton aria-label="Unit options" onClick={() => setMenuOpen((o) => !o)}>
              <MoreVertical size={18} strokeWidth={1.5} aria-hidden="true" />
            </IconButton>
            <Menu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              align="end"
              label="Unit options"
              items={[
                {
                  key: "edit",
                  label: "Edit unit",
                  icon: <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />,
                  onSelect: () => setEditUnitOpen(true),
                },
                {
                  key: "delete",
                  label: "Delete unit",
                  icon: <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />,
                  onSelect: () => setDeleteUnitOpen(true),
                },
              ]}
            />
          </div>
        }
      />
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.typeBadge}>{unit.type}</span>
          <h2 className={styles.title}>{unit.title}</h2>
        </header>

        <section aria-label="Content blocks" className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Content</h3>
            <IconButton aria-label="Add content" onClick={() => setPickerOpen(true)}>
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
                <ContentBlockCard
                  key={block.id}
                  block={block}
                  onEdit={block.type === "text" ? openEditText : undefined}
                  onDelete={(b) => setPendingDeleteBlock(b)}
                />
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
              <button
                type="button"
                className={styles.addTaskLink}
                onClick={() =>
                  navigate(`/tasks?newTaskCourseId=${course.id}&newTaskUnitId=${unit.id}`)
                }
              >
                <Plus size={14} strokeWidth={1.5} aria-hidden="true" /> Add task
              </button>
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
          {practiceOpen && (
            <PracticeSection courseId={course.id} unitId={unit.id} entries={unitPractice} />
          )}
        </section>
      </div>

      <AddContentSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onChoose={openComposer}
      />

      {composerType && (
        <ContentBlockComposer
          open={composerType !== null}
          onClose={() => setComposerType(null)}
          unitId={unit.id}
          blockType={composerType}
          editingBlock={editingBlock}
        />
      )}

      <UnitFormSheet
        open={editUnitOpen}
        onClose={() => setEditUnitOpen(false)}
        unit={unit}
        onSubmit={async (values) => {
          await updateUnit(unit.id, values);
        }}
      />

      <ConfirmationDialog
        open={deleteUnitOpen}
        onCancel={() => setDeleteUnitOpen(false)}
        onConfirm={async () => {
          await deleteUnit(unit.id);
          setDeleteUnitOpen(false);
          navigate(`/courses/${course.id}`, { replace: true });
        }}
        title={`Delete "${unit.title}"?`}
        description="This permanently deletes this unit's content, tasks, and practice scores. This cannot be undone."
        confirmLabel="Delete unit"
        destructive
      />

      <ConfirmationDialog
        open={pendingDeleteBlock !== null}
        onCancel={() => setPendingDeleteBlock(null)}
        onConfirm={async () => {
          if (pendingDeleteBlock) await deleteBlock(pendingDeleteBlock.id);
          setPendingDeleteBlock(null);
        }}
        title={`Delete "${pendingDeleteBlock?.title}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
