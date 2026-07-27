import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CourseFormSheet } from "./CourseFormSheet";
import type { Tag } from "@/types/entities";

const tags: Tag[] = [
  { id: "tag-1", name: "University", color: "slate", createdAt: "", updatedAt: "" },
  { id: "tag-2", name: "AI", color: "teal", createdAt: "", updatedAt: "" },
];

describe("CourseFormSheet", () => {
  it("does not render its form when closed", () => {
    render(<CourseFormSheet open={false} onClose={vi.fn()} tags={tags} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/course name/i)).not.toBeInTheDocument();
  });

  it("requires a course name before submitting — code stays optional", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CourseFormSheet open onClose={vi.fn()} tags={tags} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /add course/i }));
    expect(await screen.findByText(/course name is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the trimmed name and selected tags, with code/instructor/description omitted when blank", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CourseFormSheet open onClose={onClose} tags={tags} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/course name/i), "  CSAI 101  ");
    await userEvent.click(screen.getByRole("button", { name: "University" }));
    await userEvent.click(screen.getByRole("button", { name: /^add course$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "CSAI 101",
      code: undefined,
      instructor: undefined,
      description: undefined,
      tagIds: ["tag-1"],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("pre-fills fields from an existing course when editing", () => {
    render(
      <CourseFormSheet
        open
        onClose={vi.fn()}
        tags={tags}
        course={{
          id: "c1",
          name: "Existing Course",
          tagIds: ["tag-2"],
          order: 0,
          createdAt: "",
          updatedAt: "",
        }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/course name/i)).toHaveValue("Existing Course");
    expect(screen.getByRole("button", { name: "AI" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
