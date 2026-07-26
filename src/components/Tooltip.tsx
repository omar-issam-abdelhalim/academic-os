import { useId, type ReactElement } from "react";
import { cloneElement } from "react";
import styles from "./Tooltip.module.css";

export interface TooltipProps {
  label: string;
  children: ReactElement<{ "aria-describedby"?: string }>;
}

/** CSS-driven (hover/focus-within) so it works identically for pointer and
 * keyboard users without extra JS — appears on hover or keyboard focus of
 * the wrapped element. */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  return (
    <span className={styles.wrapper}>
      {cloneElement(children, { "aria-describedby": id })}
      <span role="tooltip" id={id} className={styles.bubble}>
        {label}
      </span>
    </span>
  );
}
