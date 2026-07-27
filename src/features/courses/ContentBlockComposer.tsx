import { useEffect, useRef, useState } from "react";
import { Dialog, Sheet, Field, Input, Textarea, Button, SegmentedControl } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import { maxSizeBytesFor } from "@/domain/contentValidation";
import {
  createTextBlock,
  createUploadBlock,
  updateTextBlock,
  UploadValidationError,
} from "@/data/repositories/contentBlockRepository";
import type { ContentBlock } from "@/types/entities";
import styles from "./ContentBlockComposer.module.css";

export type ComposableBlockType = "text" | "file" | "image" | "video";

const ACCEPT: Record<Exclude<ComposableBlockType, "text">, string> = {
  image: "image/*",
  video: "video/*",
  file: ".pdf,.doc,.docx,.txt,application/pdf,application/msword,text/plain",
};

const TITLES: Record<ComposableBlockType, { create: string; edit: string }> = {
  text: { create: "Add text", edit: "Edit text" },
  file: { create: "Add file", edit: "Edit file" },
  image: { create: "Add image", edit: "Edit image" },
  video: { create: "Add video", edit: "Edit video" },
};

export interface ContentBlockComposerProps {
  open: boolean;
  onClose: () => void;
  unitId: string;
  blockType: ComposableBlockType;
  /** When set, edits this block's title/content instead of creating a new
   * one — only meaningful for `type: "text"` (file/image/video blocks are
   * replace-only: delete and re-add rather than swapping the underlying
   * file, per PRODUCT_SPEC.md §5's "content is atomic" framing). */
  editingBlock?: Extract<ContentBlock, { type: "text" }>;
}

/**
 * Type-specific composer opened after AddContentSheet's type picker
 * (STAGE_1A_UX_ARCHITECTURE.md §I). Text blocks get a Markdown source
 * editor with a live safe-rendered preview toggle — never a raw-HTML
 * affordance (SECURITY.md §1). File/image/video blocks get a title plus a
 * native file picker; the file is validated (SECURITY.md §2) and stored
 * as an opaque Blob before the ContentBlock is created.
 */
export function ContentBlockComposer({
  open,
  onClose,
  unitId,
  blockType,
  editingBlock,
}: ContentBlockComposerProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;
  const title = editingBlock ? TITLES[blockType].edit : TITLES[blockType].create;

  return (
    <Overlay open={open} onClose={onClose} title={title}>
      {open && (
        <ContentBlockComposerBody
          key={editingBlock?.id ?? blockType}
          unitId={unitId}
          blockType={blockType}
          editingBlock={editingBlock}
          onClose={onClose}
        />
      )}
    </Overlay>
  );
}

function ContentBlockComposerBody({
  unitId,
  blockType,
  editingBlock,
  onClose,
}: {
  unitId: string;
  blockType: ComposableBlockType;
  editingBlock?: Extract<ContentBlock, { type: "text" }>;
  onClose: () => void;
}) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(editingBlock?.title ?? "");
  const [content, setContent] = useState(editingBlock?.content ?? "");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    if (blockType === "text") {
      setSubmitting(true);
      try {
        if (editingBlock) {
          await updateTextBlock(editingBlock.id, { title: title.trim(), content });
        } else {
          await createTextBlock(unitId, title.trim(), content);
        }
        onClose();
      } catch {
        setError("Couldn't save this note locally. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!file) {
      setError("Choose a file to add.");
      return;
    }
    setSubmitting(true);
    try {
      await createUploadBlock(unitId, blockType, title.trim(), file);
      onClose();
    } catch (err) {
      setError(
        err instanceof UploadValidationError ? err.message : "Couldn't save this file locally.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.form}>
      <Field label="Title" required error={error}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>

      {blockType === "text" ? (
        <>
          <SegmentedControl
            options={[
              { value: "write" as const, label: "Write" },
              { value: "preview" as const, label: "Preview" },
            ]}
            value={mode}
            onChange={setMode}
            label="Editor mode"
          />
          {mode === "write" ? (
            <Field
              label="Content"
              hint="Supports # headings, **bold**, *italic*, - lists, [links](https://…), and `code`."
            >
              {(fieldProps) => (
                <Textarea
                  {...fieldProps}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                />
              )}
            </Field>
          ) : (
            <div className={styles.preview}>
              {content.trim() ? (
                <SafeMarkdown source={content} />
              ) : (
                <p className={styles.previewEmpty}>Nothing to preview yet.</p>
              )}
            </div>
          )}
        </>
      ) : (
        <Field
          label="File"
          hint={`Max ${Math.round(maxSizeBytesFor(blockType) / (1024 * 1024))} MB.`}
        >
          {(fieldProps) => (
            <input
              {...fieldProps}
              type="file"
              accept={ACCEPT[blockType]}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className={styles.fileInput}
            />
          )}
        </Field>
      )}

      <Button onClick={handleSubmit} loading={submitting}>
        {editingBlock ? "Save changes" : "Add to unit"}
      </Button>
    </div>
  );
}
