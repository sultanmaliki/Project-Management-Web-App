import { useState } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import { Plus, ArrowLeft } from "lucide-react";

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Mock data
  const project = {
    id: projectId,
    title: "E-Commerce Platform",
    description: "Building a modern e-commerce solution with React and Node.js for our enterprise clients",
    teamMembers: [
      { id: "1", name: "Alice Johnson", avatar: undefined },
      { id: "2", name: "Bob Smith", avatar: undefined },
      { id: "3", name: "Carol White", avatar: undefined },
      { id: "4", name: "David Brown", avatar: undefined },
    ],
  };

  const [tasks, setTasks] = useState([
    {
      id: "1",
      title: "Design product listing page",
      assignee: { name: "Alice Johnson", avatar: undefined },
      deadline: "Oct 20, 2025",
      priority: "high" as const,
      status: "todo" as const,
    },
    {
      id: "2",
      title: "Setup authentication system",
      assignee: { name: "Bob Smith", avatar: undefined },
      deadline: "Oct 18, 2025",
      priority: "high" as const,
      status: "todo" as const,
    },
    {
      id: "3",
      title: "Implement payment gateway",
      assignee: { name: "Carol White", avatar: undefined },
      deadline: "Oct 22, 2025",
      priority: "medium" as const,
      status: "in-progress" as const,
    },
    {
      id: "4",
      title: "Build shopping cart functionality",
      assignee: { name: "David Brown", avatar: undefined },
      deadline: "Oct 19, 2025",
      priority: "high" as const,
      status: "in-progress" as const,
    },
    {
      id: "5",
      title: "Setup database schema",
      assignee: { name: "Alice Johnson", avatar: undefined },
      deadline: "Oct 15, 2025",
      priority: "medium" as const,
      status: "done" as const,
    },
    {
      id: "6",
      title: "Create API endpoints",
      assignee: { name: "Bob Smith", avatar: undefined },
      deadline: "Oct 16, 2025",
      priority: "low" as const,
      status: "done" as const,
    },
  ]);

  const handleSaveTask = (taskData: any) => {
    if (selectedTask) {
      // Edit existing task
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, ...taskData } : t));
    } else {
      // Create new task
      const newTask = {
        id: String(tasks.length + 1),
        ...taskData,
        assignee: project.teamMembers.find(m => m.id === taskData.assignee) || project.teamMembers[0],
      };
      setTasks([...tasks, newTask]);
    }
    setSelectedTask(null);
  };

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-slate-900">{project.title}</h1>
            <p className="text-slate-600 mt-1">{project.description}</p>
          </div>
          <Button onClick={() => setIsTaskModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        {/* Team Members */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">Team:</span>
          <div className="flex -space-x-2">
            {project.teamMembers.map((member) => (
              <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-sm bg-blue-500 text-white">
                  {member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700">To Do</h3>
              <span className="text-sm text-slate-500 bg-slate-200 px-2 py-1 rounded">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {todoTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  {...task}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700">In Progress</h3>
              <span className="text-sm text-slate-500 bg-orange-200 px-2 py-1 rounded">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  {...task}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700">Done</h3>
              <span className="text-sm text-slate-500 bg-green-200 px-2 py-1 rounded">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  {...task}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <TaskModal
        open={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        teamMembers={project.teamMembers}
        initialTask={selectedTask}
      />
    </div>
  );
}
