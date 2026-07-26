import { describe, expect, it, beforeEach } from "vitest";
import { preferencesDb } from "@/data/db";
import { listTags, createTag, updateTag, deleteTag } from "./tagRepository";

beforeEach(async () => {
  await preferencesDb.delete();
  await preferencesDb.open();
});

describe("tagRepository", () => {
  it("starts empty on a fresh install", async () => {
    expect(await listTags()).toEqual([]);
  });

  it("creates a tag and lists it alphabetically", async () => {
    await createTag("YouTube", "rose");
    await createTag("AI", "plum");
    const tags = await listTags();
    expect(tags.map((t) => t.name)).toEqual(["AI", "YouTube"]);
  });

  it("updates a tag's name/color", async () => {
    const tag = await createTag("Self Study", "sage");
    await updateTag(tag.id, { name: "Self-Study", color: "teal" });
    const [updated] = await listTags();
    expect(updated?.name).toBe("Self-Study");
    expect(updated?.color).toBe("teal");
  });

  it("deletes a tag", async () => {
    const tag = await createTag("ZC", "slate");
    await deleteTag(tag.id);
    expect(await listTags()).toEqual([]);
  });
});
