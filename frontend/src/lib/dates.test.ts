import { formatDeadline, isOverdue, todayISO } from "./dates";

describe("todayISO", () => {
  it("formats local date parts with zero padding", () => {
    expect(todayISO(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayISO(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("isOverdue", () => {
  const today = "2026-09-24";

  it("is true only for unfinished tasks whose deadline is before today", () => {
    expect(isOverdue("2026-09-23", "todo", today)).toBe(true);
    expect(isOverdue("2026-09-23", "in-progress", today)).toBe(true);
  });

  it("is false on the deadline day itself and for future deadlines", () => {
    expect(isOverdue("2026-09-24", "todo", today)).toBe(false);
    expect(isOverdue("2026-09-25", "todo", today)).toBe(false);
  });

  it("is false for finished tasks and tasks without a deadline", () => {
    expect(isOverdue("2020-01-01", "done", today)).toBe(false);
    expect(isOverdue(null, "todo", today)).toBe(false);
  });

  it("compares correctly across month and year boundaries", () => {
    expect(isOverdue("2025-12-31", "todo", "2026-01-01")).toBe(true);
    expect(isOverdue("2026-02-28", "todo", "2026-03-01")).toBe(true);
  });
});

describe("formatDeadline", () => {
  it("does not shift the day because of timezones", () => {
    // new Date("2025-10-20") would be parsed as UTC and could render as Oct 19 in western timezones.
    expect(formatDeadline("2025-10-20")).toContain("20");
    expect(formatDeadline("2025-01-01")).toContain("1");
    expect(formatDeadline("2025-01-01")).toContain("2025");
  });

  it("handles missing and malformed values", () => {
    expect(formatDeadline(null)).toBe("No deadline");
    expect(formatDeadline("garbage")).toBe("garbage");
  });
});
