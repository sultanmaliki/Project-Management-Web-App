import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "./TaskCard";
import { todayISO } from "@/lib/dates";
import { task } from "@/test/fixtures";

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

describe("TaskCard", () => {
  it("shows title, status, assignee and priority", () => {
    render(<TaskCard task={task({ title: "Fix bug", priority: "high", status: "in-progress", assignee: { id: 1, name: "Zoe" } })} />);
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Zoe")).toBeInTheDocument();
    expect(screen.getByLabelText("High priority")).toBeInTheDocument();
  });

  it("marks late unfinished tasks as overdue", () => {
    render(<TaskCard task={task({ deadline: daysFromNow(-2) })} />);
    expect(screen.getByText(/\(overdue\)/)).toBeInTheDocument();
  });

  it.each([
    ["due today", () => daysFromNow(0), "todo" as const],
    ["due later", () => daysFromNow(3), "todo" as const],
    ["finished", () => daysFromNow(-9), "done" as const],
  ])("does not mark a task that is %s as overdue", (_label, deadline, status) => {
    render(<TaskCard task={task({ deadline: deadline(), status })} />);
    expect(screen.queryByText(/\(overdue\)/)).not.toBeInTheDocument();
  });

  it("copes with unassigned tasks and missing deadlines", () => {
    render(<TaskCard task={task()} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("No deadline")).toBeInTheDocument();
  });

  it("renders untrusted text as text, never as markup", () => {
    const evil = '<img src=x onerror="window.__pwned=1">';
    const { container } = render(<TaskCard task={task({ title: evil })} />);
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("is keyboard accessible when clickable", async () => {
    const onClick = vi.fn();
    render(<TaskCard task={task({ title: "Open me" })} onClick={onClick} />);
    const card = screen.getByRole("button", { name: "Open task Open me" });
    card.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("is not a button (and not draggable) when there is no handler", () => {
    render(<TaskCard task={task()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
