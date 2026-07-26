import { FileText, Image as ImageIcon, Video, File } from "lucide-react";
import { Sheet, Dialog } from "@/components";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import styles from "./AddContentSheet.module.css";

export interface AddContentSheetProps {
  open: boolean;
  onClose: () => void;
  onChoose: (type: "text" | "file" | "image" | "video") => void;
}

const TYPES = [
  { type: "text" as const, label: "Text", description: "A formatted note", Icon: FileText },
  { type: "file" as const, label: "File", description: "PDF or document", Icon: File },
  { type: "image" as const, label: "Image", description: "Photo or scan", Icon: ImageIcon },
  { type: "video" as const, label: "Video", description: "A video file", Icon: Video },
];

/**
 * Type-first picker (STAGE_1A_UX_ARCHITECTURE.md §I): "a single inline
 * 'compose anything' box would have to guess intent." Mobile uses a
 * bottom sheet, desktop the same flow as a centered dialog. Choosing a
 * type is Stage 2 reference behavior — the composer/upload pipeline
 * itself is Stage 3 (once the Blob store is wired to real forms).
 */
export function AddContentSheet({ open, onClose, onChoose }: AddContentSheetProps) {
  const isDesktop = useIsDesktop();
  const Overlay = isDesktop ? Dialog : Sheet;

  return (
    <Overlay open={open} onClose={onClose} title="Add content">
      <div className={styles.grid}>
        {TYPES.map(({ type, label, description, Icon }) => (
          <button key={type} type="button" className={styles.option} onClick={() => onChoose(type)}>
            <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.optionLabel}>{label}</span>
            <span className={styles.optionDescription}>{description}</span>
          </button>
        ))}
      </div>
    </Overlay>
  );
}
