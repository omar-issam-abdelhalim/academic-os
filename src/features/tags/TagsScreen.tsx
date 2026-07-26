import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import {
  Sheet,
  Dialog,
  IconButton,
  Input,
  Field,
  TagChip,
  EmptyState,
  Button,
  ConfirmationDialog,
} from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { listTags, createTag, deleteTag } from "@/data/repositories/tagRepository";
import type { TagColor } from "@/types/entities";
import styles from "./TagsScreen.module.css";

const CURATED_COLORS: TagColor[] = [
  "slate",
  "sage",
  "clay",
  "amber",
  "plum",
  "teal",
  "rose",
  "olive",
  "stone",
];

/**
 * Tags (STAGE_1A_UX_ARCHITECTURE.md §P) — real, working persistence via
 * tagRepository/preferencesDb, demonstrating the global/persistent Tag
 * architecture from DATA_MODEL.md §Tag end-to-end (this table survives
 * "Start New Semester," unlike everything under Courses/Tasks/Schedule).
 */
export function TagsScreen() {
  const tags = useLiveQuery(() => listTags(), []);
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<TagColor>("slate");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    await createTag(name.trim(), color);
    setName("");
    setColor("slate");
    setCreateOpen(false);
  }

  return (
    <div>
      <ScreenHeader
        title="Tags"
        back
        action={
          <IconButton aria-label="Add tag" onClick={() => setCreateOpen(true)}>
            <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        }
      />
      <div className={styles.content}>
        {!tags || tags.length === 0 ? (
          <EmptyState
            title="No tags yet"
            description="Tags like University, YouTube, or AI help you organize courses your way — they're reusable across every semester."
            action={
              <Button size="small" onClick={() => setCreateOpen(true)}>
                Add a tag
              </Button>
            }
          />
        ) : (
          <ul className={styles.list}>
            {tags.map((tag) => (
              <li key={tag.id} className={styles.row}>
                <TagChip label={tag.name} color={tag.color} />
                <IconButton
                  aria-label={`Delete ${tag.name} tag`}
                  variant="ghost"
                  size="small"
                  onClick={() => setPendingDelete({ id: tag.id, name: tag.name })}
                >
                  <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Overlay open={createOpen} onClose={() => setCreateOpen(false)} title="New tag">
        <div className={styles.form}>
          <Field label="Name" required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AI"
              />
            )}
          </Field>
          <div>
            <p className={styles.colorLabel}>Color</p>
            <div className={styles.colorGrid}>
              {CURATED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={styles.colorSwatch}
                  data-tag-color={c}
                  aria-label={c}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleCreate}>Save tag</Button>
        </div>
      </Overlay>

      <ConfirmationDialog
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) await deleteTag(pendingDelete.id);
          setPendingDelete(null);
        }}
        title={`Delete "${pendingDelete?.name}"?`}
        description="Any courses using this tag will simply lose that tag — their other data is untouched."
        confirmLabel="Delete tag"
        destructive
      />
    </div>
  );
}
