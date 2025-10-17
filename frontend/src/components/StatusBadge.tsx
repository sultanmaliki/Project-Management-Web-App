import { Badge } from "./ui/badge";

interface StatusBadgeProps {
  status: "todo" | "in-progress" | "done";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    todo: { label: "To Do", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
    "in-progress": { label: "In Progress", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
    done: { label: "Done", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  };

  const { label, className } = variants[status];

  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
}
