/** Reference-UI fixture data only — never written to Dexie. Dates are
 * generated relative to load time so Overdue/Today/Upcoming always has a
 * realistic mix to demonstrate (see src/domain/academicWeek.ts). */
import type { Task } from "@/types/entities";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d.toISOString();
}

export const fixtureTasks: Task[] = [
  {
    id: "task-1",
    courseId: "course-csai101",
    unitId: "unit-csai-t3",
    title: "Solve backpropagation practice set",
    dueDate: daysFromNow(-2),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-2",
    courseId: "course-math2",
    unitId: "unit-math-a2",
    title: "Finish Assignment 2, questions 4–7",
    dueDate: daysFromNow(-1),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-3",
    courseId: "course-csai101",
    unitId: "unit-csai-l4",
    title: "Review Lecture 04 slides",
    dueDate: daysFromNow(0),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-4",
    courseId: "course-csai101",
    title: "Reply to study group about project groups",
    dueDate: daysFromNow(0),
    completed: true,
    completedAt: new Date().toISOString(),
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-5",
    courseId: "course-git",
    unitId: "unit-git-v2",
    title: "Practice rebasing on a scratch repo",
    dueDate: daysFromNow(2),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-6",
    courseId: "course-math2",
    title: "Read ahead: Chapter 6 intro",
    dueDate: daysFromNow(5),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-7",
    courseId: "course-ml",
    title: "Watch Week 2 lecture videos",
    dueDate: daysFromNow(9),
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "task-8",
    title: "Organize lecture notes folder",
    completed: false,
    createdAt: "",
    updatedAt: "",
  },
];
