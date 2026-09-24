export type Role = "admin" | "manager" | "developer";
export type TaskStatus = "todo" | "in-progress" | "done";
export type Priority = "low" | "medium" | "high";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  developer: "Developer",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface UserListItem extends User {
  project_count: number;
  task_count: number;
}

export interface UserBrief {
  id: number;
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null; // YYYY-MM-DD
  project_id: number;
  assignee: UserBrief | null;
  created_at: string;
}

export interface MyTask extends Task {
  project_title: string;
}

export interface ProjectSummary {
  id: number;
  title: string;
  description: string | null;
  owner_id: number | null;
  created_at: string;
  task_count: number;
  done_count: number;
  progress: number;
  team: UserBrief[];
}

export interface ProjectDetail extends ProjectSummary {
  tasks: Task[];
}

export interface DashboardStats {
  project_count: number;
  total_tasks: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

export interface UserStory {
  title: string;
  description: string;
  priority: Priority;
}

/** Payload for creating or partially updating a task. */
export interface TaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  deadline?: string | null;
  assignee_id?: number | null;
}
