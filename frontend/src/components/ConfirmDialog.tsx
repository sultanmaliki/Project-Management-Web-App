import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/** Confirmation for destructive actions. Stays open (with a busy button) until the action settles. */
export function ConfirmDialog({ open, title, description, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // The handler has already told the user what went wrong; keep the dialog open so they can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && !busy && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          {/* A plain Button (not AlertDialogAction) so the dialog doesn't close before the request finishes. */}
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
