/**
 * TaskDetailDialog – modální dialog s detailem úkolu
 */

import { Task, STATUS_LABELS, TeamMember, QuarterDef } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, User, Users, AlertTriangle, Play } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  owner?: TeamMember;
  participants?: TeamMember[];
  quarters?: QuarterDef[];
}

export function TaskDetailDialog({ open, onOpenChange, task, owner, participants = [], quarters = [] }: TaskDetailDialogProps) {
  if (!task) return null;
  const quarterLabel = quarters.find((q) => q.id === task.quarterId)?.label || task.quarterId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold text-primary">{quarterLabel}</span>
            <StatusBadge status={task.status} />
          </div>
          <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {task.description && (
            <p className="text-muted-foreground leading-relaxed">{task.description}</p>
          )}

          {task.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img src={task.imageUrl} alt="Příloha" className="w-full object-cover" />
            </div>
          )}

          {/* Důvod zpoždění */}
          {task.delayReason && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Důvod zpoždění: </span>
                {task.delayReason}
              </div>
            </div>
          )}

          {/* Datum zahájení */}
          {task.startDate && (
            <div className="flex items-center gap-2 text-sm">
              <Play className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Zahájeno:</span>
              <span className="font-medium">
                {format(new Date(task.startDate), "d. MMMM yyyy", { locale: cs })}
              </span>
            </div>
          )}

          {/* Termín */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Termín:</span>
            <span className="font-medium">
              {format(new Date(task.dueDate), "d. MMMM yyyy", { locale: cs })}
            </span>
          </div>

          {owner && (
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Zodpovídá:</span>
              <div className="flex items-center gap-2">
                <TeamAvatar member={owner} size="sm" />
                <span className="text-sm font-medium">{owner.name}</span>
              </div>
            </div>
          )}

          {participants.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Účastníci:</span>
              </div>
              <div className="flex flex-wrap gap-2 ml-6">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1">
                    <TeamAvatar member={p} size="sm" />
                    <span className="text-sm">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
