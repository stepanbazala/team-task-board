/**
 * TaskDetailDialog – modální dialog s detailem úkolu
 * Obrázky jako miniatury s lightboxem, kategorie tagy
 */

import { Task, STATUS_LABELS, TeamMember, QuarterDef, CategoryDef, getTaskSegmentIds } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Calendar, User, Users, AlertTriangle, Play, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  owner?: TeamMember;
  participants?: TeamMember[];
  quarters?: QuarterDef[];
  segments?: CategoryDef[];
  deliveryTypes?: CategoryDef[];
  onEdit?: (task: Task) => void;
}

export function TaskDetailDialog({ open, onOpenChange, task, owner, participants = [], quarters = [], segments = [], deliveryTypes = [], onEdit }: TaskDetailDialogProps) {
  if (!task) return null;
  const quarterLabel = quarters.find((q) => q.id === task.quarterId)?.label || task.quarterId;
  const newQuarterLabel = task.newQuarterId ? quarters.find((q) => q.id === task.newQuarterId)?.label : undefined;
  const segmentLabels = getTaskSegmentIds(task)
    .map((sid) => segments.find((s) => s.id === sid)?.label)
    .filter(Boolean) as string[];
  const deliveryLabel = task.deliveryTypeId ? deliveryTypes.find((d) => d.id === task.deliveryTypeId)?.label : undefined;
  const images = task.imageUrls || (task.imageUrl ? [task.imageUrl] : []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-primary">{quarterLabel}</span>
            {newQuarterLabel && (
              <>
                <ArrowRight className="w-3 h-3 text-destructive" />
                <span className="text-xs font-semibold text-destructive">{newQuarterLabel}</span>
              </>
            )}
            <StatusBadge status={task.status} />
          </div>
          <DialogTitle className="text-xl leading-snug">{task.title}</DialogTitle>
          {onEdit && (
            <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => onEdit(task)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Upravit
            </Button>
          )}
        </DialogHeader>

        <div className="space-y-5">
          {/* Kategorie tagy */}
          {(segmentLabels.length > 0 || deliveryLabel) && (
            <div className="flex gap-2 flex-wrap">
              {segmentLabels.map((label) => (
                <span key={label} className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">{label}</span>
              ))}
              {deliveryLabel && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-accent text-accent-foreground">{deliveryLabel}</span>
              )}
            </div>
          )}

          {task.description && (
            <p className="text-muted-foreground leading-relaxed">{task.description}</p>
          )}

          {/* Obrázky jako miniatury s lightboxem */}
          {images.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Přílohy ({images.length})</p>
              <ImageLightbox images={images} />
            </div>
          )}

          {/* Důvod zpoždění */}
          {task.delayReason && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Důvod zpoždění: </span>
                {task.delayReason}
                {newQuarterLabel && (
                  <div className="mt-1 font-medium">Nově plánované dodání: {newQuarterLabel}</div>
                )}
              </div>
            </div>
          )}

          {task.startDate && (
            <div className="flex items-center gap-2 text-sm">
              <Play className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Zahájeno:</span>
              <span className="font-medium">{format(new Date(task.startDate), "d. MMMM yyyy", { locale: cs })}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Termín:</span>
            <span className="font-medium">{format(new Date(task.dueDate), "d. MMMM yyyy", { locale: cs })}</span>
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
