import { NavLink } from "react-router-dom";
import { Home, CheckSquare, Calendar, BookOpen, BarChart2, Settings, Command } from "lucide-react";
import { cn } from "@/lib/classNames";
import styles from "./Sidebar.module.css";

const ITEMS = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/tasks", label: "Tasks", Icon: CheckSquare },
  { to: "/schedule", label: "Schedule", Icon: Calendar },
  { to: "/courses", label: "Courses", Icon: BookOpen },
  { to: "/performance", label: "Performance", Icon: BarChart2 },
  { to: "/settings", label: "Settings", Icon: Settings },
];

export function Sidebar({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  return (
    <nav className={styles.sidebar} aria-label="Primary">
      <div className={styles.wordmark}>Academic OS</div>
      <ul className={styles.list}>
        {ITEMS.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) => cn(styles.item, isActive && styles.active)}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    fill={isActive ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <button type="button" className={styles.paletteHint} onClick={onOpenCommandPalette}>
        <Command size={16} strokeWidth={1.5} aria-hidden="true" />
        <span>Quick navigate</span>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>
    </nav>
  );
}
