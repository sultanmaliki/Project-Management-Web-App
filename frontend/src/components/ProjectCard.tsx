import { CheckSquare, Users } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ProjectSummary } from "@/lib/types";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

export function ProjectCard({ project, onClick }: { project: ProjectSummary; onClick: () => void }) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Open project ${project.title}`}
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 outline-none"
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <CardHeader>
        <CardTitle className="text-slate-800 break-words">{project.title}</CardTitle>
        {project.description && <p className="text-slate-500 text-sm mt-2 line-clamp-2">{project.description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Progress</span>
            <span className="text-slate-900">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" aria-label="Project progress" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckSquare className="w-4 h-4" aria-hidden />
            <span>
              {project.done_count}/{project.task_count} Tasks
            </span>
          </div>
          <div className="flex items-center gap-2" aria-label={`${project.team.length} team members`}>
            <Users className="w-4 h-4 text-slate-600" aria-hidden />
            <div className="flex -space-x-2">
              {project.team.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="w-6 h-6 border-2 border-white" title={member.name}>
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.team.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                  +{project.team.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
