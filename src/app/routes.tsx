import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RequireSemester } from "./RequireSemester";
import { SemesterSetupScreen } from "@/features/semester/SemesterSetupScreen";
import { HomeScreen } from "@/features/home/HomeScreen";
import { Skeleton } from "@/components";

// Route-level code splitting (Stage 2 §42: avoid a huge initial bundle) —
// Home and Semester Setup are the two screens most likely to be the first
// thing a user sees, so they stay in the main chunk; everything else loads
// on demand.
const SemesterEndScreen = lazy(() =>
  import("@/features/semester/SemesterEndScreen").then((m) => ({ default: m.SemesterEndScreen })),
);
const StartNewSemesterScreen = lazy(() =>
  import("@/features/semester/StartNewSemesterScreen").then((m) => ({
    default: m.StartNewSemesterScreen,
  })),
);
const TasksScreen = lazy(() =>
  import("@/features/tasks/TasksScreen").then((m) => ({ default: m.TasksScreen })),
);
const ScheduleScreen = lazy(() =>
  import("@/features/schedule/ScheduleScreen").then((m) => ({ default: m.ScheduleScreen })),
);
const CoursesScreen = lazy(() =>
  import("@/features/courses/CoursesScreen").then((m) => ({ default: m.CoursesScreen })),
);
const CourseDetailScreen = lazy(() =>
  import("@/features/courses/CourseDetailScreen").then((m) => ({
    default: m.CourseDetailScreen,
  })),
);
const UnitDetailScreen = lazy(() =>
  import("@/features/courses/UnitDetailScreen").then((m) => ({ default: m.UnitDetailScreen })),
);
const PerformanceScreen = lazy(() =>
  import("@/features/performance/PerformanceScreen").then((m) => ({
    default: m.PerformanceScreen,
  })),
);
const MoreScreen = lazy(() =>
  import("@/features/more/MoreScreen").then((m) => ({ default: m.MoreScreen })),
);
const TagsScreen = lazy(() =>
  import("@/features/tags/TagsScreen").then((m) => ({ default: m.TagsScreen })),
);
const SettingsScreen = lazy(() =>
  import("@/features/settings/SettingsScreen").then((m) => ({ default: m.SettingsScreen })),
);

function RouteFallback() {
  return <Skeleton style={{ height: 200, margin: 16 }} />;
}

/**
 * Route tree implementing STAGE_1A_UX_ARCHITECTURE.md §F (sitemap).
 * Semester Setup is deliberately outside <AppShell> (no persistent nav
 * chrome during the gate screen, per §S); everything else renders inside
 * the shared responsive shell. Semester-dependent routes sit behind
 * <RequireSemester>; Settings does not (§S: reachable pre-semester).
 */
export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/semester-setup" element={<SemesterSetupScreen />} />
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route element={<RequireSemester />}>
            <Route path="home" element={<HomeScreen />} />
            <Route path="tasks" element={<TasksScreen />} />
            <Route path="schedule" element={<ScheduleScreen />} />
            <Route path="courses" element={<CoursesScreen />} />
            <Route path="courses/:courseId" element={<CourseDetailScreen />} />
            <Route path="courses/:courseId/units/:unitId" element={<UnitDetailScreen />} />
            <Route path="performance" element={<PerformanceScreen />} />
            <Route path="more" element={<MoreScreen />} />
            <Route path="tags" element={<TagsScreen />} />
            <Route path="data/export" element={<SemesterEndScreen />} />
            <Route path="data/new-semester" element={<StartNewSemesterScreen />} />
          </Route>
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
