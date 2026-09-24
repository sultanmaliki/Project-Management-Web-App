import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import { MIN_PASSWORD_LENGTH } from "./SignupPage";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < MIN_PASSWORD_LENGTH) return setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (next !== confirm) return setError("New passwords do not match.");
    setSubmitting(true);
    try {
      await api.auth.changePassword(current, next);
      toast.success("Password updated.");
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
