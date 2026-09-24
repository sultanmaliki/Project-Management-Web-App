import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import App from "./App";
import { AUTH_EXPIRED_EVENT, api, tokenStore } from "@/lib/api";
import { admin, dev, manager, project } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const { createMockApi } = await import("@/test/mockApi");
  return { ...actual, api: createMockApi() };
});

const signInAs = (user: typeof admin) => {
  tokenStore.set("stored-token");
  vi.mocked(api.auth.me).mockResolvedValue(user);
};

const unauthorized = () => new AxiosError("nope", "ERR_BAD_REQUEST", undefined, undefined, { status: 401 } as never);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.auth.config).mockResolvedValue({ allow_signup: true });
  vi.mocked(api.dashboard).mockResolvedValue({ project_count: 0, total_tasks: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 });
  vi.mocked(api.projects.list).mockResolvedValue([]);
  vi.mocked(api.tasks.mine).mockResolvedValue([]);
  vi.mocked(api.users.list).mockResolvedValue([]);
});

describe("route guards", () => {
  it("sends anonymous visitors to the login form", async () => {
    renderWithProviders(<App />, "/projects");
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("restores a session from the stored token", async () => {
    signInAs(manager);
    renderWithProviders(<App />, "/");
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(api.auth.me).toHaveBeenCalledTimes(1);
  });

  it("drops an invalid/expired stored token and shows login", async () => {
    tokenStore.set("expired");
    vi.mocked(api.auth.me).mockRejectedValue(unauthorized());
    renderWithProviders(<App />, "/");
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it("hides the Users area from non-admins and redirects direct visits", async () => {
    signInAs(dev);
    renderWithProviders(<App />, "/users");
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /users/i })).not.toBeInTheDocument();
    expect(api.users.list).not.toHaveBeenCalled();
  });

  it("lets admins into the Users page", async () => {
    signInAs(admin);
    renderWithProviders(<App />, "/users");
    expect(await screen.findByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
  });

  it("shows a 404 page inside the app for unknown routes", async () => {
    signInAs(manager);
    renderWithProviders(<App />, "/definitely/not/a/page");
    expect(await screen.findByText(/doesn't exist/i)).toBeInTheDocument();
  });

  it("signs the user out when any request reports an expired session", async () => {
    signInAs(manager);
    renderWithProviders(<App />, "/");
    await screen.findByRole("heading", { name: "Dashboard" });
    act(() => {
      tokenStore.clear();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    });
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});

describe("login flow", () => {
  it("logs in, stores the token and lands on the dashboard", async () => {
    vi.mocked(api.auth.login).mockResolvedValue({ access_token: "jwt-1", user: manager });
    renderWithProviders(<App />, "/");
    const user = userEvent.setup();

    const submit = await screen.findByRole("button", { name: "Login" });
    expect(submit).toBeDisabled(); // nothing typed yet
    await user.type(screen.getByLabelText("Email"), "  mona@example.com ");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(submit);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(api.auth.login).toHaveBeenCalledWith("mona@example.com", "correct-horse");
    expect(tokenStore.get()).toBe("jwt-1");
  });

  it("shows the server's message on bad credentials and stays on the form", async () => {
    vi.mocked(api.auth.login).mockRejectedValue(
      new AxiosError("x", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 401,
        data: { detail: "Incorrect email or password" },
      } as never),
    );
    renderWithProviders(<App />, "/");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "a@b.co");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
    expect(tokenStore.get()).toBeNull();
    expect(screen.getByRole("button", { name: "Login" })).toBeEnabled(); // can retry
  });

  it("does not offer a fake password reset, and hides sign-up when it is disabled", async () => {
    vi.mocked(api.auth.config).mockResolvedValue({ allow_signup: false });
    renderWithProviders(<App />, "/");
    await screen.findByRole("button", { name: "Login" });
    expect(screen.getByText(/ask an administrator/i)).toBeInTheDocument();
    await waitFor(() => expect(api.auth.config).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: /sign up/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/demo accounts/i)).not.toBeInTheDocument();
  });

  it("returns to the page the visitor originally asked for", async () => {
    vi.mocked(api.auth.login).mockResolvedValue({ access_token: "jwt", user: manager });
    vi.mocked(api.projects.get).mockResolvedValue(project());
    renderWithProviders(<App />, "/projects/1");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "mona@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Login" }));
    expect(await screen.findByRole("heading", { name: "Apollo" })).toBeInTheDocument();
  });

  it("logging out clears the token and does not leak the previous page to the next user", async () => {
    signInAs(manager);
    vi.mocked(api.projects.get).mockResolvedValue(project());
    vi.mocked(api.auth.login).mockResolvedValue({ access_token: "jwt-2", user: dev });
    renderWithProviders(<App />, "/projects/1");
    const user = userEvent.setup();

    await screen.findByRole("heading", { name: "Apollo" });
    await user.click(screen.getByRole("button", { name: /logout/i }));
    expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();

    await user.type(screen.getByLabelText("Email"), "dana@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Login" }));
    // Lands on the dashboard, not on the manager's project page.
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
