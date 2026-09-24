import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ProjectDetailPage } from "./ProjectDetailPage";
import { api, tokenStore } from "@/lib/api";
import { admin, dev, listUser, manager, project, task } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { AxiosError } from "axios";
import type { User } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const { createMockApi } = await import("@/test/mockApi");
  return { ...actual, api: createMockApi() };
});

function renderPage(as: User) {
  tokenStore.set("t");
  vi.mocked(api.auth.me).mockResolvedValue(as);
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
    </Routes>,
    "/projects/1",
  );
}

const httpError = (status: number) => new AxiosError("x", "E", undefined, undefined, { status, data: { detail: "nope" } } as never);
const column = (name: string) => screen.getByRole("region", { name: `${name} tasks` });

/** Simulate an HTML5 drag from a card onto a column (jsdom has no real drag & drop). */
function dragTo(cardName: string, columnName: string) {
  const card = screen.getByRole("button", { name: `Open task ${cardName}` });
  const data: Record<string, string> = {};
  const dataTransfer = { setData: (k: string, v: string) => (data[k] = v), getData: (k: string) => data[k] ?? "" };
  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragOver(column(columnName), { dataTransfer });
  fireEvent.drop(column(columnName), { dataTransfer });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.projects.get).mockResolvedValue(project());
  vi.mocked(api.users.list).mockResolvedValue([listUser(manager), listUser(dev)]);
  vi.mocked(api.tasks.update).mockResolvedValue(task());
});

describe("as a manager", () => {
  it("shows the board grouped by status with management actions", async () => {
    renderPage(manager);
    expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
    expect(within(column("To Do")).getByText("Design page")).toBeInTheDocument();
    expect(within(column("In Progress")).getByText("Ship it")).toBeInTheDocument();
    expect(within(column("Done")).getByText("Audit")).toBeInTheDocument();
    for (const name of [/add task/i, /^edit$/i, /ai stories/i, /delete/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("moves a card by drag & drop and persists the new status", async () => {
    renderPage(manager);
    await screen.findByRole("heading", { name: "Apollo" });
    dragTo("Design page", "Done");
    // optimistic: the card moves immediately
    expect(within(column("Done")).getByText("Design page")).toBeInTheDocument();
    await waitFor(() => expect(api.tasks.update).toHaveBeenCalledWith(10, { status: "done" }));
  });

  it("rolls back and reports when the server refuses a move", async () => {
    vi.mocked(api.tasks.update).mockRejectedValue(httpError(403));
    renderPage(manager);
    await screen.findByRole("heading", { name: "Apollo" });
    dragTo("Design page", "Done");
    await waitFor(() => expect(api.projects.get).toHaveBeenCalledTimes(2)); // reloaded from the server
    expect(within(column("To Do")).getByText("Design page")).toBeInTheDocument();
  });

  it("ignores a drop onto the column the card is already in", async () => {
    renderPage(manager);
    await screen.findByRole("heading", { name: "Apollo" });
    dragTo("Design page", "To Do");
    expect(api.tasks.update).not.toHaveBeenCalled();
  });

  it("creates a task with the trimmed title and chosen fields", async () => {
    vi.mocked(api.projects.addTask).mockResolvedValue(task({ id: 99 }));
    renderPage(manager);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /add task/i }));
    const save = screen.getByRole("button", { name: "Create task" });
    expect(save).toBeDisabled(); // a title is required
    await user.type(screen.getByLabelText("Task title"), "  Write tests  ");
    await user.click(save);
    await waitFor(() =>
      expect(api.projects.addTask).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Write tests", status: "todo", priority: "medium", deadline: null, assignee_id: null, description: null }),
      ),
    );
  });

  it("keeps the dialog open and shows an error when saving fails", async () => {
    vi.mocked(api.projects.addTask).mockRejectedValue(httpError(422));
    renderPage(manager);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /add task/i }));
    await user.type(screen.getByLabelText("Task title"), "Doomed");
    await user.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(api.projects.addTask).toHaveBeenCalled());
    expect(screen.getByLabelText("Task title")).toHaveValue("Doomed"); // nothing typed is lost
  });

  it("asks for confirmation before deleting a task", async () => {
    vi.mocked(api.tasks.remove).mockResolvedValue(undefined);
    renderPage(manager);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Open task Design page" }));
    await user.click(screen.getByRole("button", { name: "Delete task" }));
    expect(api.tasks.remove).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.tasks.remove).toHaveBeenCalledWith(10));
  });

  it("only lets an admin or the owner delete the project", async () => {
    // manager id 2 owns project 1 in the fixture -> allowed
    const { unmount } = renderPage(manager);
    expect(await screen.findByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    unmount();
    // a different manager is not the owner
    renderPage({ ...manager, id: 77 });
    await screen.findByRole("heading", { name: "Apollo" });
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it("lets an admin delete any project", async () => {
    vi.mocked(api.projects.get).mockResolvedValue(project({ owner_id: 999 }));
    renderPage(admin);
    expect(await screen.findByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });
});

describe("as a developer", () => {
  beforeEach(() => vi.mocked(api.projects.get).mockResolvedValue(project()));

  it("sees the board but none of the management controls, and never loads the user list", async () => {
    renderPage(dev);
    expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
    for (const name of [/add task/i, /^edit$/i, /ai stories/i, /^delete$/i]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
    expect(api.users.list).not.toHaveBeenCalled();
  });

  it("can only drag their own tasks", async () => {
    renderPage(dev); // dev id 3 is assigned "Design page"
    await screen.findByRole("heading", { name: "Apollo" });
    expect(screen.getByRole("button", { name: "Open task Design page" })).toHaveAttribute("draggable", "true");
    expect(screen.getByRole("button", { name: "Open task Ship it" })).toHaveAttribute("draggable", "false");
    dragTo("Ship it", "Done"); // someone else's task: the UI refuses before calling the API
    expect(api.tasks.update).not.toHaveBeenCalled();
  });

  it("edits only the status of their own task", async () => {
    renderPage(dev);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Open task Design page" }));
    expect(screen.getByLabelText("Task title")).toBeDisabled();
    expect(screen.getByLabelText("Deadline")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.tasks.update).toHaveBeenCalledWith(10, { status: "todo" })); // status only
  });

  it("opens teammates' tasks read-only", async () => {
    renderPage(dev);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Open task Ship it" }));
    expect(screen.getByLabelText("Task title")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
  });
});

describe("error states", () => {
  it("shows a not-found page for a project that is missing or hidden", async () => {
    vi.mocked(api.projects.get).mockRejectedValue(httpError(404));
    renderPage(dev);
    expect(await screen.findByText(/doesn't exist, or you don't have access/i)).toBeInTheDocument();
  });

  it("offers a retry when the server fails", async () => {
    vi.mocked(api.projects.get).mockRejectedValueOnce(httpError(500)).mockResolvedValue(project());
    renderPage(manager);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  });
});
