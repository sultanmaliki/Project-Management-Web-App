import axios, { AxiosError } from "axios";
import type {
  DashboardStats,
  MyTask,
  ProjectDetail,
  ProjectSummary,
  Role,
  Task,
  TaskInput,
  TaskStatus,
  User,
  UserListItem,
  UserStory,
} from "./types";

const TOKEN_KEY = "projectflow.token";
export const AUTH_EXPIRED_EVENT = "projectflow:auth-expired";

/**
 * The access token lives in localStorage so a refresh keeps you signed in. That makes it readable by any
 * script running on the page, which is why the app renders no untrusted HTML and ships a strict CSP.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode): the session just won't survive a reload */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const http = axios.create({ baseURL: "/api", timeout: 20_000 });

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    // A 401 anywhere except the login form means the session is gone (expired token, deactivated user...).
    if (error.response?.status === 401 && !url.startsWith("/auth/login")) {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Turn any thrown value into a message that is safe and useful to show the user. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Cannot reach the server. Check your connection and try again.";
    const detail = (error.response.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string; loc?: unknown[] };
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
      const msg = (first.msg ?? "").replace(/^Value error, /, "");
      return field && field !== "body" ? `${field}: ${msg}` : msg || fallback;
    }
    if (error.response.status === 429) return "Too many attempts. Please wait a moment and try again.";
  }
  return fallback;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

const data = <T>(promise: Promise<{ data: T }>) => promise.then((r) => r.data);

export const api = {
  auth: {
    config: () => data<{ allow_signup: boolean }>(http.get("/auth/config")),
    login: (email: string, password: string) => data<AuthResponse>(http.post("/auth/login", { email, password })),
    signup: (name: string, email: string, password: string) =>
      data<AuthResponse>(http.post("/auth/signup", { name, email, password })),
    me: () => data<User>(http.get("/auth/me")),
    changePassword: (current_password: string, new_password: string) =>
      http.post("/auth/change-password", { current_password, new_password }).then(() => undefined),
  },
  dashboard: () => data<DashboardStats>(http.get("/dashboard")),
  projects: {
    list: (q?: string) => data<ProjectSummary[]>(http.get("/projects", { params: q ? { q } : undefined })),
    get: (id: number | string) => data<ProjectDetail>(http.get(`/projects/${id}`)),
    create: (input: { title: string; description?: string }) =>
      data<ProjectSummary>(http.post("/projects", input)),
    update: (id: number, input: { title?: string; description?: string }) =>
      data<ProjectSummary>(http.patch(`/projects/${id}`, input)),
    remove: (id: number) => http.delete(`/projects/${id}`).then(() => undefined),
    addTask: (projectId: number, input: TaskInput & { title: string }) =>
      data<Task>(http.post(`/projects/${projectId}/tasks`, input)),
  },
  tasks: {
    mine: (status?: TaskStatus) => data<MyTask[]>(http.get("/tasks/mine", { params: status ? { status } : undefined })),
    update: (id: number, input: TaskInput) => data<Task>(http.patch(`/tasks/${id}`, input)),
    remove: (id: number) => http.delete(`/tasks/${id}`).then(() => undefined),
  },
  users: {
    list: () => data<UserListItem[]>(http.get("/users")),
    create: (input: { name: string; email: string; password: string; role: Role }) =>
      data<User>(http.post("/users", input)),
    update: (id: number, input: Partial<{ name: string; email: string; password: string; role: Role; is_active: boolean }>) =>
      data<User>(http.patch(`/users/${id}`, input)),
    remove: (id: number) => http.delete(`/users/${id}`).then(() => undefined),
  },
  ai: {
    userStories: (description: string) =>
      data<{ stories: UserStory[] }>(http.post("/ai/user-stories", { description }, { timeout: 45_000 })),
  },
};
