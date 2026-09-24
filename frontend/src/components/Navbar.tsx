import { FolderKanban, KeyRound, LayoutDashboard, LogOut, Users } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/types";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { cn } from "./ui/utils";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-md px-3 md:px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
    isActive ? "bg-primary text-primary-foreground" : "text-slate-700 hover:bg-slate-100",
  );

/** A sidebar on desktop; collapses into a compact top bar on small screens. */
export function Navbar() {
  const { user, logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;

  return (
    <aside className="shrink-0 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 flex flex-wrap md:flex-nowrap items-center md:items-stretch md:flex-col md:w-64 md:h-screen">
      <div className="px-4 py-3 md:p-6">
        <span className="text-xl font-semibold text-blue-600">ProjectFlow</span>
      </div>
      <Separator className="hidden md:block" />

      <nav className="order-last md:order-none w-full md:w-auto md:flex-1 flex md:flex-col gap-1 md:space-y-2 overflow-x-auto p-2 md:p-4" aria-label="Main">
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard className="w-5 h-5" aria-hidden /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={linkClass}>
          <FolderKanban className="w-5 h-5" aria-hidden /> Projects
        </NavLink>
        {user.role === "admin" && (
          <NavLink to="/users" className={linkClass}>
            <Users className="w-5 h-5" aria-hidden /> Users
          </NavLink>
        )}
      </nav>

      <Separator className="hidden md:block" />
      <div className="ml-auto flex items-center gap-1 px-2 md:ml-0 md:flex-col md:items-stretch md:gap-2 md:p-4">
        <div className="hidden md:block px-2 pb-2">
          <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
          <p className="text-xs text-slate-500 truncate">
            {user.email} · {ROLE_LABELS[user.role]}
          </p>
        </div>
        <Button variant="ghost" className="md:w-full md:justify-start gap-3" aria-label="Change password" onClick={() => setPasswordOpen(true)}>
          <KeyRound className="w-5 h-5" aria-hidden /> <span className="hidden md:inline">Change password</span>
        </Button>
        <Button
          variant="ghost"
          className="md:w-full md:justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
          aria-label="Logout"
          onClick={logout}
        >
          <LogOut className="w-5 h-5" aria-hidden /> <span className="hidden md:inline">Logout</span>
        </Button>
      </div>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </aside>
  );
}
