/** Reference-UI fixture data only — never written to Dexie. */
import type { Course, Unit, ContentBlock } from "@/types/entities";

export const fixtureCourses: Course[] = [
  {
    id: "course-csai101",
    name: "CSAI 101",
    code: "CSAI 101",
    instructor: "Dr. Nadia Farouk",
    description: "Introduction to Computer Science and Artificial Intelligence.",
    tagIds: ["tag-university", "tag-ai"],
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "course-math2",
    name: "Mathematics II",
    code: "MATH 202",
    instructor: "Dr. Youssef Kamal",
    tagIds: ["tag-university"],
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "course-git",
    name: "Git & GitHub Course",
    instructor: undefined,
    description: "A self-paced course covering version control fundamentals.",
    tagIds: ["tag-youtube", "tag-self-study"],
    order: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "course-ml",
    name: "Machine Learning Specialization",
    tagIds: ["tag-self-study", "tag-ai", "tag-semester-2"],
    order: 3,
    createdAt: "",
    updatedAt: "",
  },
];

export const fixtureUnits: Unit[] = [
  {
    id: "unit-csai-l4",
    courseId: "course-csai101",
    title: "Lecture 04 — Neural Networks",
    type: "Lecture",
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-csai-t3",
    courseId: "course-csai101",
    title: "Tutorial 03 — Backpropagation Practice",
    type: "Tutorial",
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-csai-l3",
    courseId: "course-csai101",
    title: "Lecture 03 — Perceptrons",
    type: "Lecture",
    order: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-math-c5",
    courseId: "course-math2",
    title: "Chapter 5 — Integration by Parts",
    type: "Chapter",
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-math-a2",
    courseId: "course-math2",
    title: "Assignment 2",
    type: "Assignment",
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-git-v1",
    courseId: "course-git",
    title: "Video 1 — Branching & Merging",
    type: "Video",
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-git-v2",
    courseId: "course-git",
    title: "Video 2 — Rebasing",
    type: "Video",
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "unit-ml-w1",
    courseId: "course-ml",
    title: "Week 1 — Supervised Learning",
    type: "Chapter",
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
];

export function courseById(id: string): Course | undefined {
  return fixtureCourses.find((c) => c.id === id);
}

export function unitsForCourse(courseId: string): Unit[] {
  return fixtureUnits.filter((u) => u.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function unitById(id: string): Unit | undefined {
  return fixtureUnits.find((u) => u.id === id);
}

export function contentBlocksForUnit(unitId: string): ContentBlock[] {
  return fixtureContentBlocks.filter((b) => b.unitId === unitId).sort((a, b) => a.order - b.order);
}

export const fixtureContentBlocks: ContentBlock[] = [
  {
    id: "block-slides",
    unitId: "unit-csai-l4",
    title: "Lecture Slides",
    type: "file",
    blobId: "blob-1",
    originalFileName: "w4_v3_final_FINAL.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2_400_000,
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "block-summary",
    unitId: "unit-csai-l4",
    title: "My Summary",
    type: "text",
    content:
      "## Key ideas\n\nA **neural network** learns by adjusting weights to minimize loss.\n\n- Forward pass computes predictions\n- Backward pass computes gradients\n- The *chain rule* ties it together\n\nSee `Tutorial 03` for a worked example.",
    order: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "block-notes-photo",
    unitId: "unit-csai-l4",
    title: "Handwritten Notes",
    type: "image",
    blobId: "blob-2",
    originalFileName: "IMG_4821.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 1_100_000,
    order: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "block-lab-video",
    unitId: "unit-csai-l4",
    title: "Lab Explanation",
    type: "video",
    blobId: "blob-3",
    originalFileName: "lab_walkthrough.mp4",
    mimeType: "video/mp4",
    sizeBytes: 42_000_000,
    order: 3,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "block-git-notes",
    unitId: "unit-git-v1",
    title: "Command Reference",
    type: "text",
    content: "`git branch`, `git checkout -b`, `git merge` — see video for live demo.",
    order: 0,
    createdAt: "",
    updatedAt: "",
  },
];
