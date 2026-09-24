import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { Badge } from "./ui/badge";

const STYLES: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  "in-progress": "bg-orange-100 text-orange-700 hover:bg-orange-100",
  done: "bg-green-100 text-green-700 hover:bg-green-100",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="secondary" className={STYLES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
