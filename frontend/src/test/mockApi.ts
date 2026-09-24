import { vi } from "vitest";

/** One shared, fully mocked `api` object. Tests configure the calls they care about. */
export function createMockApi() {
  return {
    auth: {
      config: vi.fn().mockResolvedValue({ allow_signup: true }),
      login: vi.fn(),
      signup: vi.fn(),
      me: vi.fn(),
      changePassword: vi.fn(),
    },
    dashboard: vi.fn().mockResolvedValue({ project_count: 0, total_tasks: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 }),
    projects: { list: vi.fn().mockResolvedValue([]), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), addTask: vi.fn() },
    tasks: { mine: vi.fn().mockResolvedValue([]), update: vi.fn(), remove: vi.fn() },
    users: { list: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    ai: { userStories: vi.fn() },
  };
}
