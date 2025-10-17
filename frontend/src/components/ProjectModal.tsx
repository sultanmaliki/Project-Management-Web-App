import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { X } from "lucide-react";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: any) => void;
  initialProject?: any;
  availableUsers: Array<{ id: string; name: string; email: string; avatar?: string }>;
}

export function ProjectModal({ open, onClose, onSave, initialProject, availableUsers }: ProjectModalProps) {
  const [title, setTitle] = useState(initialProject?.title || "");
  const [description, setDescription] = useState(initialProject?.description || "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialProject?.teamMembers?.map((m: any) => m.id) || []
  );

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }

    const teamMembers = availableUsers.filter(user => selectedMembers.includes(user.id));
    
    onSave({
      title,
      description,
      teamMembers,
      progress: initialProject?.progress || 0,
      totalTasks: initialProject?.totalTasks || 0,
      completedTasks: initialProject?.completedTasks || 0,
    });
    
    handleClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setSelectedMembers([]);
    onClose();
  };

  const toggleMember = (userId: string) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== userId));
    } else {
      setSelectedMembers([...selectedMembers, userId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{initialProject ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {initialProject ? "Update the project details below." : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="Enter project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter project description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Team Members</Label>
            <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {availableUsers.map((user) => {
                const isSelected = selectedMembers.includes(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleMember(user.id)}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs bg-blue-500 text-white">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <X className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {initialProject ? "Update Project" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
