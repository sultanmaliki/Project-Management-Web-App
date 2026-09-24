import { ArrowLeft, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api";
import { STATUS_LABELS, type Task, type TaskInput, type TaskStatus } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { ConfirmDialog } from "./ConfirmDialog";
import { NotFoundPage } from "./NotFoundPage";
import { ProjectModal } from "./ProjectModal";
import { TaskCard } from "./TaskCard";
import { TaskModal, type TaskModalMode } from "./TaskModal";
import { UserStoriesDialog } from "./UserStoriesDialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { cn } from "./ui/utils";

const COLUMNS: { status: TaskStatus; badge: string }[] = [
  { status: "todo", badge: "bg-slate-200" },
  { status: "in-progress", badge: "bg-orange-200" },
  { status: "done", badge: "bg-green-200" },
];

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const project = useApi(() => api.projects.get(projectId!), [projectId]);
  const isManager = user?.role === "admin" || user?.role === "manager";
  const people = useApi(() => (isManager ? api.users.list() : Promise.resolve([])), [isManager]);

  const [taskModal, setTaskModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  if (project.loading && !project.data) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (!project.data) {
    // 404 = missing or hidden from this user; 422 = malformed id in the URL.
    return project.errorStatus === 404 || project.errorStatus === 422 ? (
      <NotFoundPage what="project" />
    ) : (
      <div className="p-4 md:p-8">
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 flex items-center justify-between">
          <span>{project.error ?? "Could not load the project."}</span>
          <Button variant="outline" size="sm" onClick={project.reload}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const data = project.data;
  const canDeleteProject = user?.role === "admin" || data.owner_id === user?.id;
  const assignees = (people.data ?? []).filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }));

  const modeFor = (task: Task | null): TaskModalMode => {
    if (isManager) return "full";
    return task && task.assignee?.id === user?.id ? "status-only" : "readonly";
  };
  const canMove = (task: Task) => isManager || task.assignee?.id === user?.id;

  const saveTask = async (input: TaskInput) => {
    try {
      if (taskModal.task) await api.tasks.update(taskModal.task.id, input);
      else await api.projects.addTask(data.id, { ...input, title: input.title ?? "" });
      toast.success(taskModal.task ? "Task updated." : "Task created.");
      setTaskModal({ open: false, task: null });
      project.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the task."));
      throw err;
    }
  };

  const deleteTask = async () => {
    if (!taskModal.task) return;
    try {
      await api.tasks.remove(taskModal.task.id);
      toast.success("Task deleted.");
      setTaskModal({ open: false, task: null });
      project.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the task."));
      throw err;
    }
  };

  const moveTask = async (taskId: number, status: TaskStatus) => {
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task || task.status === status || !canMove(task)) return;
    // Optimistic update so the card jumps immediately; roll back by reloading if the server refuses.
    project.setData((current) =>
      current ? { ...current, tasks: current.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) } : current,
    );
    try {
      await api.tasks.update(taskId, { status });
      project.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not move the task."));
      project.reload();
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>, status: TaskStatus) => {
    event.preventDefault();
    setDragOver(null);
    const id = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(id)) void moveTask(id, status);
  };

  const saveProject = async (values: { title: string; description: string }) => {
    try {
      await api.projects.update(data.id, values);
      toast.success("Project updated.");
      setProjectModalOpen(false);
      project.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the project."));
      throw err;
    }
  };

  const deleteProject = async () => {
    try {
      await api.projects.remove(data.id);
      toast.success("Project deleted.");
      navigate("/projects", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Could not delete the project."));
      throw err;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 break-words">{data.title}</h1>
            {data.description && <p className="text-slate-600 mt-1 break-words">{data.description}</p>}
          </div>
          {isManager && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={() => setStoriesOpen(true)}>
                <Sparkles className="w-4 h-4" aria-hidden /> AI stories
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setProjectModalOpen(true)}>
                <Pencil className="w-4 h-4" aria-hidden /> Edit
              </Button>
              {canDeleteProject && (
                <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => setConfirmDeleteProject(true)}>
                  <Trash2 className="w-4 h-4" aria-hidden /> Delete
                </Button>
              )}
              <Button className="gap-2" onClick={() => setTaskModal({ open: true, task: null })}>
                <Plus className="w-4 h-4" aria-hidden /> Add Task
              </Button>
            </div>
          )}
        </div>

        {data.team.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">Team:</span>
            <div className="flex -space-x-2">
              {data.team.map((member) => (
                <Avatar key={member.id} className="w-8 h-8 border-2 border-white" title={member.name}>
                  <AvatarFallback className="text-sm bg-blue-500 text-white">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(({ status, badge }) => {
            const tasks = data.tasks.filter((t) => t.status === status);
            return (
              <section
                key={status}
                aria-label={`${STATUS_LABELS[status]} tasks`}
                className={cn("space-y-4 rounded-lg p-2 -m-2 transition-colors", dragOver === status && "bg-blue-50 ring-2 ring-blue-300")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null);
                }}
                onDrop={(e) => onDrop(e, status)}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-slate-700 font-medium">{STATUS_LABELS[status]}</h2>
                  <span className={cn("text-sm text-slate-700 px-2 py-1 rounded", badge)}>{tasks.length}</span>
                </div>
                <div className="space-y-3 min-h-16">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      draggable={canMove(task)}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(task.id))}
                      onClick={() => setTaskModal({ open: true, task })}
                    />
                  ))}
                  {tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No tasks</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <TaskModal
        open={taskModal.open}
        task={taskModal.task}
        mode={modeFor(taskModal.task)}
        assignees={assignees}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSave={saveTask}
        onDelete={isManager ? deleteTask : undefined}
      />
      <ProjectModal open={projectModalOpen} project={data} onClose={() => setProjectModalOpen(false)} onSave={saveProject} />
      <UserStoriesDialog open={storiesOpen} onClose={() => setStoriesOpen(false)} projectId={data.id} initialDescription={data.description ?? ""} onCreated={project.reload} />
      <ConfirmDialog
        open={confirmDeleteProject}
        title={`Delete "${data.title}"?`}
        description={`This permanently deletes the project and its ${data.task_count} task${data.task_count === 1 ? "" : "s"}. This can't be undone.`}
        onCancel={() => setConfirmDeleteProject(false)}
        onConfirm={deleteProject}
      />
    </div>
  );
}
