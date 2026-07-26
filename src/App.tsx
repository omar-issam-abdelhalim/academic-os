import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppRoutes } from "@/app/routes";

export function App() {
  return (
    <ThemeProvider>
      {/* basename keeps every route/link correct under the GitHub Pages
          project-site subpath ("/academic-os/") in production while
          staying "/" for local dev/preview — see vite.config.ts. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  );
}
