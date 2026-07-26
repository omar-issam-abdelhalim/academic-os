import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendanceControl } from "./AttendanceControl";
import type { ScheduleOccurrence } from "@/types/entities";

const occurrence: ScheduleOccurrence = {
  id: "occ-1",
  scheduleTemplateId: "tmpl-1",
  date: "2026-07-25",
  status: "unmarked",
  courseId: "course-1",
  type: "Lecture",
  startTime: "09:00",
  endTime: "10:30",
  createdAt: "",
  updatedAt: "",
};

describe("AttendanceControl", () => {
  it("shows 'Upcoming' with no marking control before start time", () => {
    render(
      <AttendanceControl
        occurrence={occurrence}
        onMark={vi.fn()}
        now={new Date(2026, 6, 25, 8, 0)}
      />,
    );
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /attended/i })).not.toBeInTheDocument();
  });

  it("shows the marking control and 'In progress' during the class", () => {
    render(
      <AttendanceControl
        occurrence={occurrence}
        onMark={vi.fn()}
        now={new Date(2026, 6, 25, 9, 30)}
      />,
    );
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /attended/i })).toBeInTheDocument();
  });

  it("labels the state 'Attendance not recorded' — never 'Missed' — after end time with no status", () => {
    // The three-option control (including a "Missed" action button) is
    // still legitimately offered so the user can resolve it — what must
    // never happen is the *status label itself* reading as "Missed"; the
    // two strings are asserted distinctly here on purpose.
    render(
      <AttendanceControl
        occurrence={occurrence}
        onMark={vi.fn()}
        now={new Date(2026, 6, 25, 11, 0)}
      />,
    );
    expect(screen.getByText("Attendance not recorded")).toBeInTheDocument();
    const missedAction = screen.getByRole("button", { name: /missed/i });
    expect(missedAction).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onMark with the chosen status", async () => {
    const onMark = vi.fn();
    render(
      <AttendanceControl
        occurrence={occurrence}
        onMark={onMark}
        now={new Date(2026, 6, 25, 9, 30)}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /attended/i }));
    expect(onMark).toHaveBeenCalledWith("attended");
  });
});
