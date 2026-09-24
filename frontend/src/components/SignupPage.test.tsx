import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { SignupPage, validateSignup } from "./SignupPage";
import { api, tokenStore } from "@/lib/api";
import { dev } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const { createMockApi } = await import("@/test/mockApi");
  return { ...actual, api: createMockApi() };
});

describe("validateSignup", () => {
  const ok = ["Ada Lovelace", "ada@example.com", "analytical-engine", "analytical-engine"] as const;

  it("accepts valid input", () => {
    expect(validateSignup(...ok)).toBeNull();
  });

  it.each([
    ["blank name", ["  ", ok[1], ok[2], ok[3]], /full name/i],
    ["bad email", [ok[0], "not-an-email", ok[2], ok[3]], /valid email/i],
    ["email without tld", [ok[0], "a@b", ok[2], ok[3]], /valid email/i],
    ["short password", [ok[0], ok[1], "short", "short"], /at least 8/i],
    ["mismatch", [ok[0], ok[1], ok[2], "different-password"], /do not match/i],
    ["over 72 bytes", [ok[0], ok[1], "é".repeat(40), "é".repeat(40)], /too long/i],
  ] as const)("rejects %s", (_label, args, message) => {
    expect(validateSignup(...(args as unknown as [string, string, string, string]))).toMatch(message);
  });
});

describe("SignupPage", () => {
  const renderSignup = () =>
    renderWithProviders(
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
      </Routes>,
      "/signup",
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.config).mockResolvedValue({ allow_signup: true });
  });

  it("does not call the API until the form is valid", async () => {
    renderSignup();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Full name"), "Ada");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "analytical-engine");
    await user.type(screen.getByLabelText("Confirm password"), "typo");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(api.auth.signup).not.toHaveBeenCalled();
  });

  it("signs up as a developer (there is no role picker) and stores the session", async () => {
    vi.mocked(api.auth.signup).mockResolvedValue({ access_token: "new-jwt", user: dev });
    renderSignup();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Full name"), " Ada ");
    await user.type(screen.getByLabelText("Email"), " ada@example.com ");
    await user.type(screen.getByLabelText("Password"), "analytical-engine");
    await user.type(screen.getByLabelText("Confirm password"), "analytical-engine");
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(api.auth.signup).toHaveBeenCalledWith("Ada", "ada@example.com", "analytical-engine"));
    await waitFor(() => expect(tokenStore.get()).toBe("new-jwt"));
  });

  it("explains when self-service sign-up is disabled", async () => {
    vi.mocked(api.auth.config).mockResolvedValue({ allow_signup: false });
    renderSignup();
    expect(await screen.findByText(/sign-up is turned off/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
  });
});
