import { Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { ProjectCard } from "./ProjectCard";
import { ProjectModal } from "./ProjectModal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";

export function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Search on the server, but only once the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: projects, loading, error, reload } = useApi(() => api.projects.list(debouncedQuery), [debouncedQuery]);
  const canCreate = user?.role === "admin" || user?.role === "manager";

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

  return (
    <div className="p-4 md:p-8">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden />
            <Input
              aria-label="Search projects"
              placeholder="Search projects..."
              className="pl-10 w-64"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="h-5 w-5" aria-hidden /> Create Project
            </Button>
          )}
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      ) : loading && !projects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projects/${project.id}`)} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
          {debouncedQuery
            ? "No projects match your search."
            : canCreate
              ? "No projects yet. Create your first one to get started."
              : "You have no projects yet. Projects appear here once a task is assigned to you."}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
    </div>
  );
}
