import { useEffect, useState, type FormEvent } from "react";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Priority,
  type Task,
  type TaskInput,
  type TaskStatus,
  type UserBrief,
} from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

const UNASSIGNED = "none";

/**
 * full        - managers/admins: every field is editable (and the task can be deleted)
 * status-only - a developer viewing their own task: only the status can change
 * readonly    - anyone else
 */
export type TaskModalMode = "full" | "status-only" | "readonly";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  /** null = create a new task */
  task: Task | null;
  mode: TaskModalMode;
  assignees: UserBrief[];
  onSave: (input: TaskInput) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function TaskModal({ open, onClose, task, mode, assignees, onSave, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState(UNASSIGNED);
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssignee(task?.assignee ? String(task.assignee.id) : UNASSIGNED);
    setDeadline(task?.deadline ?? "");
    setStatus(task?.status ?? "todo");
    setPriority(task?.priority ?? "medium");
  }, [open, task]);

  const editable = mode === "full";
  const canSave = mode !== "readonly" && (mode === "status-only" || title.trim().length > 0) && !saving;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const input: TaskInput =
      mode === "status-only"
        ? { status }
        : {
            title: title.trim(),
            description: description.trim() || null,
            status,
            priority,
            deadline: deadline || null,
            assignee_id: assignee === UNASSIGNED ? null : Number(assignee),
          };
    setSaving(true);
    try {
      await onSave(input);
    } catch {
      // The page reports the failure; keep the dialog open so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  };

  const heading = !task ? "Create new task" : mode === "full" ? "Edit task" : "Task details";
  const blurb =
    mode === "status-only"
      ? "You can update the status of tasks assigned to you."
      : mode === "readonly"
        ? "Only managers and the assignee can change this task."
        : task
          ? "Update the task details below."
          : "Fill in the details to create a new task.";

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[560px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{heading}</DialogTitle>
              <DialogDescription>{blurb}</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="task-title">Task title</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={!editable} required autoFocus={editable} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={3} disabled={!editable} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-assignee">Assign to</Label>
                <Select value={assignee} onValueChange={setAssignee} disabled={!editable}>
                  <SelectTrigger id="task-assignee">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                    {/* keep the current assignee selectable even if the user list has not loaded */}
                    {task?.assignee && !assignees.some((a) => a.id === task.assignee!.id) && (
                      <SelectItem value={String(task.assignee.id)}>{task.assignee.name}</SelectItem>
                    )}
                    {assignees.map((member) => (
                      <SelectItem key={member.id} value={String(member.id)}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Deadline</Label>
                <Input id="task-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={!editable} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)} disabled={mode === "readonly"}>
                  <SelectTrigger id="task-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)} disabled={!editable}>
                  <SelectTrigger id="task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              {task && editable && onDelete ? (
                <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                  Delete task
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  {mode === "readonly" ? "Close" : "Cancel"}
                </Button>
                {mode !== "readonly" && (
                  <Button type="submit" disabled={!canSave}>
                    {saving ? "Saving…" : task ? "Save changes" : "Create task"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description="This permanently removes the task. This can't be undone."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await onDelete?.();
          setConfirmDelete(false);
        }}
      />
    </>
  );
}
