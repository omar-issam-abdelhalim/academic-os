import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home,
  CheckSquare,
  Calendar,
  BookOpen,
  BarChart2,
  Settings,
  Tag as TagIcon,
  Plus,
} from "lucide-react";
import { Dialog, Input } from "@/components";
import styles from "./CommandPalette.module.css";

const DESTINATIONS = [
  { label: "Home", to: "/home", Icon: Home },
  { label: "Tasks", to: "/tasks", Icon: CheckSquare },
  { label: "Schedule", to: "/schedule", Icon: Calendar },
  { label: "Courses", to: "/courses", Icon: BookOpen },
  { label: "Performance", to: "/performance", Icon: BarChart2 },
  { label: "Tags", to: "/tags", Icon: TagIcon },
  { label: "Settings", to: "/settings", Icon: Settings },
];

/** Quick-add actions — real now that the underlying creation flows are
 * real (Stage 3 replaces Stage 2's "navigation only" boundary). Each
 * navigates to the owning screen with a `?new=1` marker the screen itself
 * recognizes to auto-open its creation form, rather than duplicating form
 * logic here. */
const ACTIONS = [
  { label: "Add course", to: "/courses?new=1", Icon: Plus },
  { label: "Add task", to: "/tasks?new=1", Icon: Plus },
];

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Desktop-only quick navigation accelerator (STAGE_1A_UX_ARCHITECTURE.md
 * §D/§Q). Stage 2 scope is navigation; quick-add actions ("Add Course",
 * "Add Task" from anywhere) are Stage 3 work, once those creation flows
 * are real rather than reference-only. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(
    () => DESTINATIONS.filter((d) => d.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const actionResults = useMemo(
    () => ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function go(to: string) {
    navigate(to);
    setQuery("");
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Quick navigate">
      <Input
        ref={inputRef}
        placeholder="Go to, or add…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search destinations and actions"
      />
      <ul className={styles.results}>
        {actionResults.map(({ label, to, Icon }) => (
          <li key={to}>
            <button type="button" className={styles.result} onClick={() => go(to)}>
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
        {results.map(({ label, to, Icon }) => (
          <li key={to}>
            <button type="button" className={styles.result} onClick={() => go(to)}>
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              {label}
            </button>
          </li>
        ))}
        {results.length === 0 && actionResults.length === 0 && (
          <li className={styles.empty}>No matches</li>
        )}
      </ul>
    </Dialog>
  );
}
