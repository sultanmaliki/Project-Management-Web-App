import type { MyTask, ProjectDetail, ProjectSummary, Task, User, UserListItem } from "@/lib/types";

export const admin: User = { id: 1, name: "Ada Admin", email: "ada@example.com", role: "admin", is_active: true };
export const manager: User = { id: 2, name: "Mona Manager", email: "mona@example.com", role: "manager", is_active: true };
export const dev: User = { id: 3, name: "Dana Dev", email: "dana@example.com", role: "developer", is_active: true };

export function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 10,
    title: "Write docs",
    description: null,
    status: "todo",
    priority: "medium",
    deadline: null,
    project_id: 1,
    assignee: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function myTask(overrides: Partial<MyTask> = {}): MyTask {
  return { ...task(overrides), project_title: "Apollo", ...overrides };
}

export function project(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  const tasks = overrides.tasks ?? [
    task({ id: 10, title: "Design page", status: "todo", assignee: { id: 3, name: "Dana Dev" } }),
    task({ id: 11, title: "Ship it", status: "in-progress", assignee: { id: 4, name: "Sam Dev" } }),
    task({ id: 12, title: "Audit", status: "done" }),
  ];
  return {
    id: 1,
    title: "Apollo",
    description: "Moon shot",
    owner_id: 2,
    created_at: "2026-01-01T00:00:00Z",
    task_count: tasks.length,
    done_count: tasks.filter((t) => t.status === "done").length,
    progress: 33,
    team: [{ id: 3, name: "Dana Dev" }],
    ...overrides,
    tasks,
  };
}

export function summary(p: ProjectDetail): ProjectSummary {
  const { tasks: _tasks, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

export function listUser(u: User, extra: Partial<UserListItem> = {}): UserListItem {
  return { ...u, project_count: 0, task_count: 0, ...extra };
}
