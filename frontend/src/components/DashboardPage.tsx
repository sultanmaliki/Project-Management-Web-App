import { AlertTriangle, CheckSquare, Clock, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";
import { TaskCard } from "./TaskCard";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDeveloper = user?.role === "developer";
  const [modalOpen, setModalOpen] = useState(false);

  const stats = useApi(() => api.dashboard(), []);
  const projects = useApi(() => (isDeveloper ? Promise.resolve([]) : api.projects.list()), [isDeveloper]);
  const myTasks = useApi(() => (isDeveloper ? api.tasks.mine() : Promise.resolve([])), [isDeveloper]);

  const handleCreate = async (values: { title: string; description: string }) => {
    try {
      const project = await api.projects.create(values);
      toast.success("Project created.");
      setModalOpen(false);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create the project."));
      throw err;
    }
  };

  const activeTasks = (myTasks.data ?? []).filter((t) => t.status !== "done").slice(0, 6);
  const error = stats.error ?? projects.error ?? myTasks.error;

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Welcome back, {user?.name}! Here's an overview of your {isDeveloper ? "tasks" : "projects"}.
            </p>
          </div>
          {!isDeveloper && (
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" aria-hidden /> Create New Project
            </Button>
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.loading && !stats.data ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : (
            <>
              <StatCard label="Total Tasks" value={stats.data?.total_tasks ?? 0} icon={<CheckSquare className="w-5 h-5 text-blue-600" aria-hidden />} />
              <StatCard label="In Progress" value={stats.data?.in_progress ?? 0} icon={<Clock className="w-5 h-5 text-orange-600" aria-hidden />} />
              <StatCard label="Overdue Tasks" value={stats.data?.overdue ?? 0} icon={<AlertTriangle className="w-5 h-5 text-red-600" aria-hidden />} />
            </>
          )}
        </div>

        {isDeveloper ? (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">My Active Tasks</h2>
            {myTasks.loading && !myTasks.data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : activeTasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/projects/${task.project_id}`)} />
                ))}
              </div>
            ) : (
              <p className="text-slate-500">Nothing on your plate right now. 🎉</p>
            )}
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Projects</h2>
            {projects.loading && !projects.data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : (projects.data ?? []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(projects.data ?? []).slice(0, 3).map((project) => (
                  <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
                ))}
              </div>
            ) : (
              <p className="text-slate-500">No projects yet — create one to get started.</p>
            )}
          </section>
        )}
      </div>

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
    </div>
  );
}
