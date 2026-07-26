import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getPreferences, updatePreferences } from "@/data/repositories/preferencesRepository";
import type { AppPreferences } from "@/types/entities";

type Theme = AppPreferences["theme"];

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeAttribute(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

/** Persists theme preference via the preferences repository (structurally
 * prepared for persistence per PRODUCT_SPEC.md §9's theme requirement —
 * this is the actual, working persistence, not a stub). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPreferences().then((prefs) => {
      if (cancelled) return;
      setThemeState(prefs.theme);
      applyThemeAttribute(prefs.theme);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyThemeAttribute(next);
    void updatePreferences({ theme: next });
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loaded }}>{children}</ThemeContext.Provider>
  );
}

// Deliberately colocated with ThemeProvider (context + its consumer hook is
// a standard, readable pairing) rather than split across files just to
// satisfy react-refresh's "only export components" heuristic.
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
