import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { semesterDb } from "@/data/db";
import { createCourse } from "@/data/repositories/courseRepository";
import { TaskFormSheet } from "./TaskFormSheet";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

describe("TaskFormSheet", () => {
  it("requires a title before submitting", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskFormSheet open onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("button", { name: /add task/i }));
    expect(await screen.findByText(/task title is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits with course/unit left optional (a task may stand fully alone)", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskFormSheet open onClose={vi.fn()} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/task title/i), "Review notes");
    await userEvent.click(screen.getByRole("button", { name: /^add task$/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Review notes",
      dueDate: undefined,
      courseId: undefined,
      unitId: undefined,
    });
  });

  it("lists real courses from courseRepository for the course picker", async () => {
    await createCourse({ name: "CSAI 101" });
    render(<TaskFormSheet open onClose={vi.fn()} onSubmit={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("CSAI 101")).toBeInTheDocument());
  });

  it("shows a Delete action only when editing an existing task", () => {
    render(
      <TaskFormSheet
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        task={{
          id: "t1",
          title: "Existing",
          completed: false,
          createdAt: "",
          updatedAt: "",
        }}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /delete task/i })).toBeInTheDocument();
  });
});
