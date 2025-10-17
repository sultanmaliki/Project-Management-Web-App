import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { SignupPage } from "./components/SignupPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { DashboardPage } from "./components/DashboardPage";
import { ProjectsPage } from "./components/ProjectsPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { UsersPage } from "./components/UsersPage";
import { Navbar } from "./components/Navbar";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Define TypeScript types to be used across the app
type UserRole = "admin" | "manager" | "developer";
type View = "login" | "signup" | "forgot-password" | "dashboard" | "projects" | "users" | "project-detail";

interface User {
  email: string;
  role: UserRole;
  name: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // --- Authentication ---
  // This is a temporary mock login. A real app would have a /token endpoint.
  const handleLogin = (email: string, password: string) => {
    const demoUsers = [
        { email: "admin@projectflow.com", password: "admin123", role: "admin" as UserRole, name: "Admin User" },
        { email: "manager@projectflow.com", password: "manager123", role: "manager" as UserRole, name: "Project Manager" },
        { email: "dev@projectflow.com", password: "dev123", role: "developer" as UserRole, name: "Developer" },
    ];
    const user = demoUsers.find(u => u.email === email && u.password === password);

    if (user) {
      setCurrentUser(user);
      setCurrentView("dashboard");
      toast.success(`Welcome back, ${user.name}!`);
    } else {
      toast.error("Invalid credentials.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("login");
  };

  // --- Navigation ---
  const handleNavigate = (view: View) => setCurrentView(view);

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("project-detail");
  };

  const handleBack = () => {
    setSelectedProjectId(null);
    setCurrentView("dashboard");
  };

  // --- Main Render Logic ---
  const renderMainView = () => {
    // This function decides which main component to show after login
    switch (currentView) {
      case "dashboard":
        return <DashboardPage userRole={currentUser!.role} onProjectClick={handleProjectClick} />;
      case "projects":
        return <ProjectsPage userRole={currentUser!.role} onProjectClick={handleProjectClick} />;
      case "users":
        return <UsersPage />;
      case "project-detail":
        if (selectedProjectId) {
          return <ProjectDetailPage projectId={selectedProjectId} onBack={handleBack} />;
        }
        // Fallback if no project ID is found
        handleBack(); 
        return null;
      default:
        // Default to dashboard if logged in
        return <DashboardPage userRole={currentUser!.role} onProjectClick={handleProjectClick} />;
    }
  };

  // If no user is logged in, show the authentication pages
  if (!currentUser) {
    if (currentView === "signup") {
      return <SignupPage onBackToLogin={() => setCurrentView("login")} />;
    }
    if (currentView === "forgot-password") {
      return <ForgotPasswordPage onBackToLogin={() => setCurrentView("login")} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setCurrentView("signup")} onNavigateToForgotPassword={() => setCurrentView("forgot-password")} />;
  }

  // If a user IS logged in, show the main application layout
  return (
    <>
      <div className="flex h-screen bg-slate-50">
        <Navbar
          activeView={currentView}
          onNavigate={(view) => handleNavigate(view as View)}
          userRole={currentUser.role}
          onLogout={handleLogout}
        />
        {renderMainView()}
      </div>
      <Toaster position="top-right" />
    </>
  );
}

