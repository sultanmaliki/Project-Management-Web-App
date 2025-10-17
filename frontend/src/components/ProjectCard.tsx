import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { CheckSquare, Users } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  teamMembers: Array<{ name: string; avatar?: string }>;
  onClick: () => void;
}

export function ProjectCard({
  title,
  description,
  progress,
  totalTasks,
  completedTasks,
  teamMembers,
  onClick,
}: ProjectCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-slate-200"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="text-slate-800">{title}</CardTitle>
        <p className="text-slate-500 text-sm mt-2">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600">Progress</span>
            <span className="text-slate-900">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckSquare className="w-4 h-4" />
            <span>
              {completedTasks}/{totalTasks} Tasks
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member, index) => (
                <Avatar key={index} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {teamMembers.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs text-slate-600">
                  +{teamMembers.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
