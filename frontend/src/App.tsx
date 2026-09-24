import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { DashboardPage } from "./components/DashboardPage";
import { Layout } from "./components/Layout";
import { LoginPage } from "./components/LoginPage";
import { NotFoundPage } from "./components/NotFoundPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ProjectsPage } from "./components/ProjectsPage";
import { SignupPage } from "./components/SignupPage";
import { UsersPage } from "./components/UsersPage";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "./context/AuthContext";
import type { Role } from "./lib/types";

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500" role="status">
      Loading…
    </div>
  );
}

/** Only signed-in users get past this; everyone else is sent to the login screen (and back afterwards). */
function RequireAuth() {
  const { user, initializing, loggedOut } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  // Remember where an unauthenticated visitor was headed, but not after a deliberate logout.
  if (!user) return <Navigate to="/login" replace state={loggedOut ? undefined : { from: location.pathname }} />;
  return <Outlet />;
}

/** Client-side convenience only: the API enforces the same rules and is the real gatekeeper. */
function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function PublicOnly() {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <FullPageSpinner />;
  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? "/"} replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </>
  );
}
