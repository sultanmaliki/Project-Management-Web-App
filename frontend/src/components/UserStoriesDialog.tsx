import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { PRIORITY_LABELS, type UserStory } from "@/lib/types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

interface UserStoriesDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  initialDescription: string;
  /** Called after tasks were created so the board can refresh. */
  onCreated: () => void;
}

export function UserStoriesDialog({ open, onClose, projectId, initialDescription, onCreated }: UserStoriesDialogProps) {
  const [description, setDescription] = useState("");
  const [stories, setStories] = useState<UserStory[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDescription(initialDescription);
      setStories([]);
      setSelected(new Set());
      setError(null);
    }
  }, [open, initialDescription]);

  const generate = async () => {
    setError(null);
    setGenerating(true);
    try {
      const { stories: generated } = await api.ai.userStories(description.trim());
      setStories(generated);
      setSelected(new Set(generated.map((_, i) => i)));
    } catch (err) {
      setError(errorMessage(err, "Could not generate user stories."));
    } finally {
      setGenerating(false);
    }
  };

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const addSelected = async () => {
    const chosen = stories.filter((_, i) => selected.has(i));
    setAdding(true);
    const results = await Promise.allSettled(
      chosen.map((s) => api.projects.addTask(projectId, { title: s.title.slice(0, 200), description: s.description || null, priority: s.priority })),
    );
    setAdding(false);
    const failed = results.filter((r) => r.status === "rejected").length;
    const created = results.length - failed;
    if (created > 0) onCreated();
    if (failed === 0) {
      toast.success(`Added ${created} task${created === 1 ? "" : "s"}.`);
      onClose();
    } else {
      toast.error(`Added ${created}, but ${failed} could not be created.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" aria-hidden /> Generate user stories
          </DialogTitle>
          <DialogDescription>
            Describe what you're building and let AI draft user stories. Review them, then add the ones you want as tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="story-description">Project description</Label>
          <Textarea id="story-description" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. A mobile app that lets neighbours share tools with each other" />
          <Button onClick={generate} disabled={description.trim().length < 10 || generating} className="gap-2">
            <Sparkles className="w-4 h-4" aria-hidden /> {generating ? "Generating…" : stories.length ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {stories.length > 0 && (
          <ul className="space-y-2" aria-label="Generated user stories">
            {stories.map((story, index) => (
              <li key={index} className="rounded-lg border border-slate-200 p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={selected.has(index)} onChange={() => toggle(index)} />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900 break-words">{story.title}</span>
                    {story.description && <span className="block text-sm text-slate-600 mt-1 break-words">{story.description}</span>}
                    <span className="block text-xs text-slate-500 mt-1">{PRIORITY_LABELS[story.priority]} priority</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {stories.length > 0 && (
            <Button onClick={addSelected} disabled={selected.size === 0 || adding}>
              {adding ? "Adding…" : `Add ${selected.size} as tasks`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
