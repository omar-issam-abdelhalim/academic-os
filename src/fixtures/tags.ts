/**
 * Reference-UI fixture data only — never written to Dexie. See
 * src/data/repositories/tagRepository.ts for the real, persisted global
 * Tag store (Settings → Tags starts empty on a fresh install and uses
 * that repository, not this file).
 */
import type { Tag } from "@/types/entities";

export const fixtureTags: Tag[] = [
  { id: "tag-zc", name: "ZC", color: "slate", createdAt: "", updatedAt: "" },
  { id: "tag-university", name: "University", color: "stone", createdAt: "", updatedAt: "" },
  { id: "tag-youtube", name: "YouTube", color: "rose", createdAt: "", updatedAt: "" },
  { id: "tag-self-study", name: "Self Study", color: "sage", createdAt: "", updatedAt: "" },
  { id: "tag-ai", name: "AI", color: "plum", createdAt: "", updatedAt: "" },
  { id: "tag-semester-2", name: "Semester 2", color: "teal", createdAt: "", updatedAt: "" },
];

export function tagById(id: string): Tag | undefined {
  return fixtureTags.find((t) => t.id === id);
}
