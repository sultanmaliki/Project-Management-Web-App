import type { TaskStatus } from "./types";

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A task is overdue when its deadline is before today and it is not finished. */
export function isOverdue(deadline: string | null, status: TaskStatus, today: string = todayISO()): boolean {
  return deadline !== null && status !== "done" && deadline < today;
}

/**
 * Format a YYYY-MM-DD deadline for display. The parts are used directly so the date never shifts a day
 * because of UTC/local timezone conversion (which `new Date("2025-10-20")` would cause).
 */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "No deadline";
  const [year, month, day] = deadline.split("-").map(Number);
  if (!year || !month || !day) return deadline;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
