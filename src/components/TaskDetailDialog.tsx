/**
 * TaskDetailDialog – modální dialog s detailem úkolu
 * Zobrazuje všechny informace včetně obrázku
 */

import { Task, STATUS_LABELS, QUARTER_LABELS, TeamMember } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, User, Users } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  owner?: TeamMember;
  participants?: TeamMember[];
}

export function TaskDetailDialog({ open, onOpenChange, task, owner, participants = [] }: TaskDetailDialogProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold text-primary">{QUARTER_LABELS[task.quarter]}</span>
            <StatusBadge status={task.status} />
          </div>
          <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Popis */}
          {task.description && (
            <p className="text-muted-foreground leading-relaxed">{task.description}</p>
          )}

          {/* Obrázek */}
          {task.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img src={task.imageUrl} alt="Příloha" className="w-full object-cover" />
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

          {/* Zodpovědná osoba */}
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

          {/* Účastníci */}
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
