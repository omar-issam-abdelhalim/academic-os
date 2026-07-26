import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "@/components/Button";
import { Button } from "@/components/Button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/classNames";
import styles from "./Overlay.module.css";

interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant: "dialog" | "sheet";
  footer?: ReactNode;
}

function OverlayShell({ open, onClose, title, children, variant, footer }: OverlayShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, containerRef);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.scrim}>
      {/* A real, keyboard-reachable button rather than a click handler on
          a bare div — closing on backdrop click is a mouse/touch
          convenience layered on top of the already-complete keyboard path
          (Escape, and the explicit Close button below), not a replacement
          for it. */}
      <button type="button" className={styles.scrimButton} aria-label="Close" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-title"
        className={cn(styles.panel, variant === "sheet" ? styles.sheet : styles.dialog)}
      >
        <div className={styles.header}>
          <h2 id="overlay-title" className={styles.title}>
            {title}
          </h2>
          <IconButton aria-label="Close" size="small" onClick={onClose}>
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Desktop-style centered dialog. On mobile widths, callers typically use
 * <Sheet> instead (STAGE_1A_UX_ARCHITECTURE.md §C/§D), but Dialog itself
 * still works at any width for cases (like ConfirmationDialog) that are
 * intentionally dialog-shaped on both platforms. */
export function Dialog(props: DialogProps) {
  return <OverlayShell {...props} variant="dialog" />;
}

/** Mobile-style bottom sheet — see STAGE_1A_UX_ARCHITECTURE.md §C: used
 * for focused, single-purpose interruptions that return the user to
 * exactly where they were. */
export function Sheet(props: DialogProps) {
  return <OverlayShell {...props} variant="sheet" />;
}

export interface ConfirmationDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
}: ConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Dialog>
  );
}
