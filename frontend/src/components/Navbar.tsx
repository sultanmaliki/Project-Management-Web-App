import { LayoutDashboard, FolderKanban, Users, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

interface NavbarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  userRole: "admin" | "manager" | "developer";
  onLogout: () => void;
}

export function Navbar({ activeView, onNavigate, userRole, onLogout }: NavbarProps) {
  return (
    <div className="w-64 h-screen bg-slate-50 border-r border-slate-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-blue-600">ProjectFlow</h1>
      </div>
      
      <Separator />
      
      <nav className="flex-1 p-4 space-y-2">
        <Button
          variant={activeView === "dashboard" ? "default" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onNavigate("dashboard")}
        >
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Button>
        
        <Button
          variant={activeView === "projects" ? "default" : "ghost"}
          className="w-full justify-start gap-3"
          onClick={() => onNavigate("projects")}
        >
          <FolderKanban className="w-5 h-5" />
          Projects
        </Button>
        
        {userRole === "admin" && (
          <Button
            variant={activeView === "users" ? "default" : "ghost"}
            className="w-full justify-start gap-3"
            onClick={() => onNavigate("users")}
          >
            <Users className="w-5 h-5" />
            Users
          </Button>
        )}
      </nav>
      
      <Separator />
      
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  );
}
