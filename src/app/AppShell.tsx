import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { OfflineIndicator } from "@/components";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { CommandPalette } from "./CommandPalette";
import { UpdatePrompt } from "./UpdatePrompt";
import styles from "./AppShell.module.css";

/** The one responsive shell — desktop gets a persistent sidebar, mobile
 * gets bottom navigation; both render the same route content
 * (STAGE_1A_UX_ARCHITECTURE.md §C/§D). */
export function AppShell() {
  const isDesktop = useIsDesktop();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop]);

  return (
    <div className={styles.shell}>
      <OfflineIndicator />
      <UpdatePrompt />
      <div className={styles.body}>
        {isDesktop && <Sidebar onOpenCommandPalette={() => setPaletteOpen(true)} />}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      {!isDesktop && <BottomNav />}
      {isDesktop && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />}
    </div>
  );
}
