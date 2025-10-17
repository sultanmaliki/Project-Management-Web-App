import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Calendar, AlertCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface TaskCardProps {
  title: string;
  assignee: { name: string; avatar?: string };
  deadline: string;
  priority?: "low" | "medium" | "high";
  status: "todo" | "in-progress" | "done";
  onClick?: () => void;
}

export function TaskCard({
  title,
  assignee,
  deadline,
  priority,
  status,
  onClick,
}: TaskCardProps) {
  const isOverdue = new Date(deadline) < new Date();
  
  const priorityColors = {
    low: "text-blue-600",
    medium: "text-orange-600",
    high: "text-red-600",
  };

  return (
    <Card
      className="cursor-grab hover:shadow-md transition-shadow duration-200 border-slate-200 bg-white"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-slate-800">{title}</h4>
          {priority && (
            <AlertCircle className={`w-4 h-4 flex-shrink-0 ${priorityColors[priority]}`} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <StatusBadge status={status} />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={assignee.avatar} />
              <AvatarFallback className="text-xs bg-blue-500 text-white">
                {assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-600">{assignee.name}</span>
          </div>
          
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-red-600" : "text-slate-500"}`}>
            <Calendar className="w-3 h-3" />
            <span>{deadline}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
