/** Reference-UI fixture data only — never written to Dexie. Occurrence
 * times are generated relative to "now" so the reference UI always has a
 * realistic mix of Upcoming / In Progress / Attendance-not-recorded /
 * recorded states to demonstrate, regardless of when it's opened — see
 * src/domain/attendancePresentation.ts. */
import type { ScheduleTemplate, ScheduleOccurrence } from "@/types/entities";
import { academicWeekDays } from "@/domain/academicWeek";

export const fixtureScheduleTemplates: ScheduleTemplate[] = [
  {
    id: "sched-csai-lecture",
    courseId: "course-csai101",
    type: "Lecture",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:30",
    location: "Room C201",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sched-csai-tutorial",
    courseId: "course-csai101",
    type: "Tutorial",
    dayOfWeek: 3,
    startTime: "11:00",
    endTime: "12:00",
    location: "Room C104",
    instructor: "TA Mariam Adel",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sched-math-lecture",
    courseId: "course-math2",
    type: "Lecture",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "11:30",
    location: "Room B310",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "sched-math-lab",
    courseId: "course-math2",
    type: "Lab",
    dayOfWeek: 4,
    startTime: "13:00",
    endTime: "14:30",
    location: "Lab 2",
    active: true,
    createdAt: "",
    updatedAt: "",
  },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const now = new Date();
const weekDays = academicWeekDays(now);

// Guarantee one "in progress" occurrence right now, regardless of wall-clock
// time, so the Home/Schedule reference UI always has something live to show.
const inProgressStart = new Date(now.getTime() - 15 * 60 * 1000);
const inProgressEnd = new Date(now.getTime() + 45 * 60 * 1000);

export const fixtureScheduleOccurrences: ScheduleOccurrence[] = [
  {
    id: "occ-live",
    scheduleTemplateId: "sched-csai-lecture",
    date: isoDate(now),
    status: "unmarked",
    courseId: "course-csai101",
    type: "Lecture",
    startTime: `${String(inProgressStart.getHours()).padStart(2, "0")}:${String(inProgressStart.getMinutes()).padStart(2, "0")}`,
    endTime: `${String(inProgressEnd.getHours()).padStart(2, "0")}:${String(inProgressEnd.getMinutes()).padStart(2, "0")}`,
    location: "Room C201",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "occ-not-recorded",
    scheduleTemplateId: "sched-math-lecture",
    date: isoDate(now),
    status: "unmarked",
    courseId: "course-math2",
    type: "Lecture",
    startTime: "08:00",
    endTime: "09:00",
    location: "Room B310",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "occ-upcoming-today",
    scheduleTemplateId: "sched-csai-tutorial",
    date: isoDate(now),
    status: "unmarked",
    courseId: "course-csai101",
    type: "Tutorial",
    startTime: `${String(new Date(now.getTime() + 3 * 3600_000).getHours()).padStart(2, "0")}:00`,
    endTime: `${String(new Date(now.getTime() + 4 * 3600_000).getHours()).padStart(2, "0")}:00`,
    location: "Room C104",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "occ-attended",
    scheduleTemplateId: "sched-csai-lecture",
    date: isoDate(weekDays[0]!),
    status: "attended",
    courseId: "course-csai101",
    type: "Lecture",
    startTime: "09:00",
    endTime: "10:30",
    location: "Room C201",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "occ-missed",
    scheduleTemplateId: "sched-math-lab",
    date: isoDate(weekDays[4]!),
    status: "missed",
    courseId: "course-math2",
    type: "Lab",
    startTime: "13:00",
    endTime: "14:30",
    location: "Lab 2",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "occ-cancelled",
    scheduleTemplateId: "sched-csai-tutorial",
    date: isoDate(weekDays[3]!),
    status: "cancelled",
    notes: "Instructor unavailable",
    courseId: "course-csai101",
    type: "Tutorial",
    startTime: "11:00",
    endTime: "12:00",
    location: "Room C104",
    createdAt: "",
    updatedAt: "",
  },
];
