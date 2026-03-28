/**
 * StatusBadge – barevný odznak stavu úkolu
 */

import { TaskStatus, STATUS_LABELS } from "@/types/task";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

const statusStyles: Record<TaskStatus, string> = {
  "todo": "bg-status-todo/10 text-status-todo",
  "in-progress": "bg-status-progress/10 text-status-progress",
  "done": "bg-status-done/10 text-status-done",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
        statusStyles[status],
        className
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", {
          "bg-status-todo": status === "todo",
          "bg-status-progress": status === "in-progress",
          "bg-status-done": status === "done",
        })}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
