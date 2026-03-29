/**
 * TaskListOverlay – dialog zobrazující seznam úkolů s možností prokliknutí na detail
 * Používá se v dashboardu pro drilldown z grafů a metrik
 */

import { useState } from "react";
import { Task, TeamMember, QuarterDef, CategoryDef } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskListOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tasks: Task[];
  members: TeamMember[];
  quarters: QuarterDef[];
  segments?: CategoryDef[];
  deliveryTypes?: CategoryDef[];
}

export function TaskListOverlay({ open, onOpenChange, title, tasks, members, quarters, segments = [], deliveryTypes = [] }: TaskListOverlayProps) {
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const findMember = (id: string) => members.find((m) => m.id === id);

  return (
    <>
      <Dialog open={open && !detailTask} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{tasks.length} úkolů • klikněte pro detail</p>
          </DialogHeader>

          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const owner = findMember(task.ownerId);
              const qLabel = quarters.find((q) => q.id === task.quarterId)?.label || "";
              return (
                <div
                  key={task.id}
                  className="py-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => setDetailTask(task)}
                >
                  <StatusBadge status={task.status} />
                  {owner && <TeamAvatar member={owner} size="sm" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{qLabel}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(task.dueDate), "d. MMM", { locale: cs })}
                  </span>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Žádné úkoly</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={() => setDetailTask(null)}
        task={detailTask}
        owner={detailTask ? findMember(detailTask.ownerId) : undefined}
        participants={detailTask?.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
        quarters={quarters}
        segments={segments}
        deliveryTypes={deliveryTypes}
      />
    </>
  );
}
