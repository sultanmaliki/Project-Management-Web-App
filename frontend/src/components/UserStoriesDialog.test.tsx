import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { UserStoriesDialog } from "./UserStoriesDialog";
import { api } from "@/lib/api";
import { task } from "@/test/fixtures";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const { createMockApi } = await import("@/test/mockApi");
  return { ...actual, api: createMockApi() };
});

const STORIES = [
  { title: "As a user, I want to sign in", description: "Given valid creds", priority: "high" as const },
  { title: "As a user, I want to log out", description: "", priority: "low" as const },
  { title: "<b>bold</b> story", description: "x", priority: "medium" as const },
];

function setup(props: Partial<React.ComponentProps<typeof UserStoriesDialog>> = {}) {
  const onCreated = vi.fn();
  const onClose = vi.fn();
  render(<UserStoriesDialog open onClose={onClose} projectId={7} initialDescription="A tool-sharing app for neighbours" onCreated={onCreated} {...props} />);
  return { onCreated, onClose, user: userEvent.setup() };
}

beforeEach(() => vi.clearAllMocks());

describe("UserStoriesDialog", () => {
  it("prefills the project description and requires enough text to generate", async () => {
    const { user } = setup({ initialDescription: "short" });
    expect(screen.getByLabelText("Project description")).toHaveValue("short");
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
    await user.type(screen.getByLabelText("Project description"), " but now it is long enough");
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("generates stories and adds only the selected ones as tasks", async () => {
    vi.mocked(api.ai.userStories).mockResolvedValue({ stories: STORIES });
    vi.mocked(api.projects.addTask).mockResolvedValue(task());
    const { user, onCreated, onClose } = setup();

    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByText("As a user, I want to sign in")).toBeInTheDocument();
    expect(api.ai.userStories).toHaveBeenCalledWith("A tool-sharing app for neighbours");

    await user.click(screen.getByRole("checkbox", { name: /log out/i })); // deselect one
    await user.click(screen.getByRole("button", { name: "Add 2 as tasks" }));

    await waitFor(() => expect(api.projects.addTask).toHaveBeenCalledTimes(2));
    expect(api.projects.addTask).toHaveBeenCalledWith(7, { title: "As a user, I want to sign in", description: "Given valid creds", priority: "high" });
    expect(api.projects.addTask).not.toHaveBeenCalledWith(7, expect.objectContaining({ title: "As a user, I want to log out" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("renders AI output as text, not HTML", async () => {
    vi.mocked(api.ai.userStories).mockResolvedValue({ stories: STORIES });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByText("<b>bold</b> story")).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });

  it("shows the server's message when generation is unavailable", async () => {
    vi.mocked(api.ai.userStories).mockRejectedValue(
      new AxiosError("x", "E", undefined, undefined, { status: 503, data: { detail: "AI story generation is not configured" } } as never),
    );
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not configured");
    expect(screen.queryByRole("list", { name: /generated/i })).not.toBeInTheDocument();
  });

  it("reports partial failures and still refreshes the board for the tasks that were created", async () => {
    vi.mocked(api.ai.userStories).mockResolvedValue({ stories: STORIES.slice(0, 2) });
    vi.mocked(api.projects.addTask).mockResolvedValueOnce(task()).mockRejectedValueOnce(new Error("boom"));
    const { user, onCreated, onClose } = setup();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await user.click(await screen.findByRole("button", { name: "Add 2 as tasks" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled(); // stays open so the user can retry the failures
  });
});
