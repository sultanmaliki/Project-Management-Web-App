import { AlertCircle, Calendar } from "lucide-react";
import type { DragEvent, KeyboardEvent } from "react";
import { formatDeadline, isOverdue } from "@/lib/dates";
import { PRIORITY_LABELS, type Task } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "./ui/utils";

const PRIORITY_COLORS = {
  low: "text-blue-600",
  medium: "text-orange-600",
  high: "text-red-600",
} as const;

interface TaskCardProps {
  task: Task & { project_title?: string };
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
}

export function TaskCard({ task, onClick, draggable = false, onDragStart }: TaskCardProps) {
  const overdue = isOverdue(task.deadline, task.status);
  const interactive = Boolean(onClick);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <Card
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Open task ${task.title}` : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "border-slate-200 bg-white transition-shadow duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 outline-none",
        draggable ? "cursor-grab active:cursor-grabbing" : interactive && "cursor-pointer",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-slate-800 break-words min-w-0">{task.title}</h4>
          <AlertCircle
            className={cn("w-4 h-4 shrink-0", PRIORITY_COLORS[task.priority])}
            aria-label={`${PRIORITY_LABELS[task.priority]} priority`}
          />
        </div>
        {task.project_title && <p className="text-xs text-slate-500">{task.project_title}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        <StatusBadge status={task.status} />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs bg-blue-500 text-white">
                {task.assignee ? task.assignee.name.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-600 truncate">{task.assignee?.name ?? "Unassigned"}</span>
          </div>
          <div className={cn("flex items-center gap-1 text-xs shrink-0", overdue ? "text-red-600" : "text-slate-500")}>
            <Calendar className="w-3 h-3" aria-hidden />
            <span>{formatDeadline(task.deadline)}</span>
            {overdue && <span className="sr-only"> (overdue)</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
