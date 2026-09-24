import { useEffect, useState, type FormEvent } from "react";
import type { ProjectSummary } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: { title: string; description: string }) => Promise<void> | void;
  /** When set, the dialog edits this project instead of creating a new one. */
  project?: Pick<ProjectSummary, "title" | "description"> | null;
}

export function ProjectModal({ open, onClose, onSave, project }: ProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens so it never shows stale values.
  useEffect(() => {
    if (open) {
      setTitle(project?.title ?? "");
      setDescription(project?.description ?? "");
    }
  }, [open, project]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() });
    } catch {
      // The page reports the failure; keep the dialog open so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  };

  const editing = Boolean(project);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit project" : "Create new project"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the project details below." : "Fill in the details to create a new project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="project-title">Project title</Label>
            <Input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
