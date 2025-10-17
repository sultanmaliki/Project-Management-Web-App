import { useState, useEffect } from "react";
import axios from "axios";
import { ProjectCard } from "./ProjectCard.tsx";
import { Button } from "./ui/button.tsx";
import { Plus, Search } from "lucide-react";
import { Input } from "./ui/input.tsx";
import { ProjectModal } from "./ProjectModal.tsx";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton.tsx";

const API_URL = "http://127.0.0.1:8000";

// Define interfaces to match backend schemas
interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  teamMembers: any[];
  tasks: any[];
}

interface ProjectsPageProps {
  userRole: "admin" | "manager" | "developer";
  onProjectClick: (id: string) => void;
}

export function ProjectsPage({ userRole, onProjectClick }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Fetch projects from the backend when the component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    setIsLoading(true);
    axios.get(`${API_URL}/projects/`)
      .then(response => {
        const formattedProjects = response.data.map((p: any) => ({
          ...p,
          progress: p.tasks.length > 0 ? Math.round((p.tasks.filter((t: any) => t.status === 'done').length / p.tasks.length) * 100) : 0,
          totalTasks: p.tasks?.length || 0,
          completedTasks: p.tasks?.filter((t: any) => t.status === 'done').length || 0,
          teamMembers: [], // Team members can be added as a future feature
        }));
        setProjects(formattedProjects);
      })
      .catch(() => toast.error("Could not fetch projects from the server."))
      .finally(() => setIsLoading(false));
  };

  const handleSaveProject = (projectData: { title: string, description: string }) => {
    axios.post(`${API_URL}/projects/`, projectData)
      .then(() => {
        fetchProjects(); // Re-fetch all projects to include the new one
        setIsProjectModalOpen(false);
        toast.success("Project created successfully!");
      })
      .catch(() => toast.error("Failed to create the project."));
  };

  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-auto">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search projects..."
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(userRole === "admin" || userRole === "manager") && (
            <Button onClick={() => setIsProjectModalOpen(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Create Project
            </Button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => onProjectClick(project.id)}
            />
          ))}
        </div>
      )}

      <ProjectModal
        open={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        availableUsers={[]} // Pass an empty array as we are not assigning users on creation
      />
    </div>
  );
}

