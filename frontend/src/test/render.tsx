import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

/** Render inside a router and the auth provider (the same shell the real app uses). */
export function renderWithProviders(ui: ReactElement, route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}
