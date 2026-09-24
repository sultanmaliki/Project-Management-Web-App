import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { UsersPage } from "./UsersPage";
import { api, tokenStore } from "@/lib/api";
import { admin, dev, listUser, manager } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const { createMockApi } = await import("@/test/mockApi");
  return { ...actual, api: createMockApi() };
});

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.set("t");
  vi.mocked(api.auth.me).mockResolvedValue(admin);
  vi.mocked(api.users.list).mockResolvedValue([
    listUser(admin, { task_count: 0, project_count: 0 }),
    listUser(manager, { task_count: 4, project_count: 2 }),
    listUser({ ...dev, is_active: false }),
  ]);
});

const rowFor = (name: string) => screen.getByText(name).closest("tr")!;

describe("UsersPage", () => {
  it("lists users with role, workload and inactive state", async () => {
    renderWithProviders(<UsersPage />);
    const row = rowFor(await screen.findByText("Mona Manager").then((el) => el.textContent!));
    expect(within(row).getByText("Manager")).toBeInTheDocument();
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(rowFor("Dana Dev")).getByText("Inactive")).toBeInTheDocument();
  });

  it("filters by name or email", async () => {
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await screen.findByText("Mona Manager");
    await user.type(screen.getByLabelText("Search users"), "MONA@");
    expect(screen.getByText("Mona Manager")).toBeInTheDocument();
    expect(screen.queryByText("Dana Dev")).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Search users"));
    await user.type(screen.getByLabelText("Search users"), "zzz");
    expect(screen.getByText(/no users found/i)).toBeInTheDocument();
  });

  it("prevents an admin from deleting their own account", async () => {
    renderWithProviders(<UsersPage />);
    await screen.findByText("Mona Manager");
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete Ada Admin" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Delete Mona Manager" })).toBeEnabled();
  });

  it("requires a strong-enough password to create a user, then sends the right payload", async () => {
    vi.mocked(api.users.create).mockResolvedValue(dev);
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText("Name"), "  New Person ");
    await user.type(screen.getByLabelText("Email"), "new@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("button", { name: "Add user" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 8/i);
    expect(api.users.create).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "long-enough-pw");
    await user.click(screen.getByRole("button", { name: "Add user" }));
    await waitFor(() =>
      expect(api.users.create).toHaveBeenCalledWith({ name: "New Person", email: "new@example.com", role: "developer", password: "long-enough-pw" }),
    );
  });

  it("shows API errors (e.g. duplicate email) inside the dialog", async () => {
    vi.mocked(api.users.create).mockRejectedValue(
      new AxiosError("x", "E", undefined, undefined, { status: 409, data: { detail: "Email already registered" } } as never),
    );
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /add user/i }));
    await user.type(screen.getByLabelText("Name"), "Dup");
    await user.type(screen.getByLabelText("Email"), "dup@example.com");
    await user.type(screen.getByLabelText("Password"), "long-enough-pw");
    await user.click(screen.getByRole("button", { name: "Add user" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email already registered");
  });

  it("only sends a password when editing if one was typed", async () => {
    vi.mocked(api.users.update).mockResolvedValue(manager);
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit Mona Manager" }));
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Mona M.");
    await user.click(screen.getByRole("button", { name: "Update user" }));
    await waitFor(() => expect(api.users.update).toHaveBeenCalled());
    const [id, body] = vi.mocked(api.users.update).mock.calls[0];
    expect(id).toBe(2);
    expect(body).toMatchObject({ name: "Mona M.", role: "manager", is_active: true });
    expect(body).not.toHaveProperty("password");
  });

  it("confirms before deleting and refreshes the list", async () => {
    vi.mocked(api.users.remove).mockResolvedValue(undefined);
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Delete Mona Manager" }));
    expect(api.users.remove).not.toHaveBeenCalled();
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.users.remove).toHaveBeenCalledWith(2));
    await waitFor(() => expect(api.users.list).toHaveBeenCalledTimes(2));
  });

  it("keeps the confirm dialog open when the server refuses (e.g. last admin)", async () => {
    vi.mocked(api.users.remove).mockRejectedValue(
      new AxiosError("x", "E", undefined, undefined, { status: 409, data: { detail: "There must be at least one active administrator" } } as never),
    );
    renderWithProviders(<UsersPage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Delete Mona Manager" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(api.users.remove).toHaveBeenCalled());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
