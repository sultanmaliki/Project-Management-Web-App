import { useState, useEffect } from "react";
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

  // --- Session Persistence ---
  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setCurrentView("dashboard");
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem("currentUser");
      }
    }
  }, []);

  // --- Authentication ---
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        localStorage.setItem("currentUser", JSON.stringify(user));
        setCurrentView("dashboard");
        toast.success(`Welcome back, ${user.name}!`);
      } else {
        toast.error("Invalid credentials.");
      }
    } catch (error) {
      console.error("Login failed", error);
      toast.error("Login failed. Please try again later.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
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
        // Fallback if no project ID is found, schedule a state update
        useEffect(() => {
            handleBack();
        }, []);
        return null;
      default:
        return <DashboardPage userRole={currentUser!.role} onProjectClick={handleProjectClick} />;
    }
  };

  if (!currentUser) {
    if (currentView === "signup") {
      return <SignupPage onBackToLogin={() => setCurrentView("login")} />;
    }
    if (currentView === "forgot-password") {
      return <ForgotPasswordPage onBackToLogin={() => setCurrentView("login")} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigateToSignup={() => setCurrentView("signup")} onNavigateToForgotPassword={() => setCurrentView("forgot-password")} />;
  }

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