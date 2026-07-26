import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/classNames";
import styles from "./Menu.module.css";

export interface MenuItemDescriptor {
  key: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface MenuProps {
  open: boolean;
  onClose: () => void;
  items: MenuItemDescriptor[];
  align?: "start" | "end";
  label: string;
}

/** A lightweight anchored popover menu — desktop's content-type picker and
 * similar small choice lists. Not a full ARIA `menu`/`menuitem` roving-focus
 * widget (out of scope for Stage 2); items are plain buttons, so full
 * keyboard tab-through and Enter/Space activation work without any extra
 * ARIA plumbing. Dismissible via outside click or Escape
 * (STAGE_1A_UX_ARCHITECTURE.md §U). */
export function Menu({ open, onClose, items, align = "start", label }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      className={cn(styles.menu, align === "end" && styles.alignEnd)}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={styles.item}
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          {item.icon && <span className={styles.itemIcon}>{item.icon}</span>}
          <span className={styles.itemText}>
            <span className={styles.itemLabel}>{item.label}</span>
            {item.description && <span className={styles.itemDescription}>{item.description}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
