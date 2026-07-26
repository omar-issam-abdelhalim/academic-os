import { NavLink } from "react-router-dom";
import { Home, CheckSquare, Calendar, BookOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/classNames";
import styles from "./BottomNav.module.css";

const ITEMS = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/tasks", label: "Tasks", Icon: CheckSquare },
  { to: "/schedule", label: "Schedule", Icon: Calendar },
  { to: "/courses", label: "Courses", Icon: BookOpen },
  { to: "/more", label: "More", Icon: MoreHorizontal },
];

/** Mobile persistent bottom navigation, 5 destinations
 * (STAGE_1A_UX_ARCHITECTURE.md §C). Selected item switches to a filled
 * glyph as a non-color-dependent state signal
 * (STAGE_1B_DESIGN_SYSTEM.md §8), plus the accent color and an
 * `aria-current` for assistive tech. */
export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => cn(styles.item, isActive && styles.active)}
        >
          {({ isActive }) => (
            <>
              <Icon
                size={24}
                strokeWidth={1.5}
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
              <span className={styles.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
