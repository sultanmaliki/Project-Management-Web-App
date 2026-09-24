import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      <Navbar />
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
