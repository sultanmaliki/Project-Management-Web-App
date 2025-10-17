import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ProjectCard } from "./ProjectCard";
import { TaskCard } from "./TaskCard";
import { Button } from "./ui/button";
import { Plus, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";

const API_URL = "http://127.0.0.1:8000";

// Define component-specific interfaces
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

interface Task {
    id: string;
    title: string;
    deadline: string;
    status: "todo" | "in-progress" | "done";
    assignee: { name: string; avatar?: string } | null;
    priority?: "low" | "medium" | "high";
}

interface Stats {
    totalTasks: number;
    inProgress: number;
    overdue: number;
}

interface DashboardPageProps {
  userRole: "admin" | "manager" | "developer";
  onProjectClick: (projectId: string) => void;
  onCreateProject?: () => void; // Make optional as it's not always used
}

export function DashboardPage({ userRole, onProjectClick, onCreateProject }: DashboardPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTasks: 0, inProgress: 0, overdue: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const projectsResponse = await axios.get(`${API_URL}/projects/`);
        
        let allTasks: any[] = [];
        projectsResponse.data.forEach((p: any) => {
            allTasks = [...allTasks, ...p.tasks];
        });

        // Format projects for the cards
        const formattedProjects = projectsResponse.data.map((p: any) => ({
            ...p,
            progress: p.tasks.length > 0 ? Math.round((p.tasks.filter((t: any) => t.status === 'done').length / p.tasks.length) * 100) : 0,
            totalTasks: p.tasks.length,
            completedTasks: p.tasks.filter((t: any) => t.status === 'done').length,
            teamMembers: [],
        }));
        setProjects(formattedProjects);

        // This is a placeholder; ideally, you'd have an endpoint `/users/me/tasks`
        // For now, we'll just show all tasks for any user type
        setTasks(allTasks);

        // Calculate stats
        const now = new Date();
        setStats({
            totalTasks: allTasks.length,
            inProgress: allTasks.filter(t => t.status === 'in-progress').length,
            overdue: allTasks.filter(t => t.status !== 'done' && new Date(t.deadline) < now).length,
        });

      } catch (error) {
        toast.error("Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [userRole]);

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Welcome back! Here's an overview of your {userRole === "developer" ? "tasks" : "projects"}.
                </p>
            </div>
            {userRole !== "developer" && (
                <Button onClick={onCreateProject} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Project
                </Button>
            )}
        </div>

        {/* Stats Cards */}
        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalTasks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">In Progress</CardTitle>
                        <Clock className="w-5 h-5 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.inProgress}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Overdue Tasks</CardTitle>
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.overdue}</div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Main Content */}
        {userRole === "developer" ? (
             <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">My Active Tasks</h2>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Skeleton className="h-32 rounded-lg" />
                        <Skeleton className="h-32 rounded-lg" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.filter(t => t.status !== 'done').slice(0, 3).map((task) => (
                            <TaskCard key={task.id} {...task} />
                        ))}
                    </div>
                )}
             </div>
        ) : (
            <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Projects</h2>
                 {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-48 rounded-lg" />
                        <Skeleton className="h-48 rounded-lg" />
                        <Skeleton className="h-48 rounded-lg" />
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.slice(0, 3).map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onClick={() => onProjectClick(project.id)}
                            />
                        ))}
                    </div>
                 )}
            </div>
        )}
      </div>
    </div>
  );
}

