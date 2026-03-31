/**
 * TaskCard – karta úkolu pro kanban board
 * Miniaturní obrázky, kategorie tagy, ztučněný čárkovaný okraj pro přeplánované úkoly
 */

import { Task, TeamMember, QuarterDef, CategoryDef } from "@/types/task";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { ImageLightbox } from "@/components/ImageLightbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Pencil, Trash2, AlertTriangle, Copy } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  owner?: TeamMember;
  participants?: TeamMember[];
  quarters: QuarterDef[];
  segments?: CategoryDef[];
  deliveryTypes?: CategoryDef[];
  isRescheduled?: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, owner, participants = [], quarters, segments = [], deliveryTypes = [], isRescheduled, onEdit, onDelete, onDuplicate, onClick }: TaskCardProps) {
  const quarterLabel = quarters.find((q) => q.id === task.quarterId)?.label || task.quarterId;
  const newQuarterLabel = task.newQuarterId ? quarters.find((q) => q.id === task.newQuarterId)?.label : undefined;
  const segmentLabel = task.segmentId ? segments.find((s) => s.id === task.segmentId)?.label : undefined;
  const deliveryLabel = task.deliveryTypeId ? deliveryTypes.find((d) => d.id === task.deliveryTypeId)?.label : undefined;
  const images = task.imageUrls || (task.imageUrl ? [task.imageUrl] : []);
  const hasDelay = Boolean(task.delayReason || task.newQuarterId);
  const highlightDelayedTask = isRescheduled || hasDelay;
  const rescheduledCardClass = highlightDelayedTask
    ? "border-[8px] border-dashed border-destructive bg-destructive/20 shadow-[0_0_0_4px_hsl(var(--destructive)/0.18),0_18px_45px_-18px_hsl(var(--destructive)/0.75)] ring-4 ring-destructive/35 relative overflow-hidden"
    : "";

  return (
    <div
      className={`george-card-hover p-4 cursor-pointer animate-fade-in ${rescheduledCardClass}`}
      style={highlightDelayedTask ? { background: "linear-gradient(135deg, hsl(var(--destructive) / 0.22), hsl(var(--card)) 46%, hsl(var(--muted) / 0.85))" } : undefined}
      onClick={() => onClick(task)}
    >
      {highlightDelayedTask && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="absolute inset-y-0 left-0 w-3 bg-destructive/85" aria-hidden="true" />
          <Badge variant="destructive" className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] shadow-sm">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Zpožděno
          </Badge>
          {newQuarterLabel && (
            <span className="text-xs font-semibold text-destructive">
              Nově: {newQuarterLabel}
            </span>
          )}
        </div>
      )}

      {/* Horní řádek: dodání + stav */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">{quarterLabel}</span>
          {newQuarterLabel && (
            <span className="text-xs font-semibold text-destructive">→ {newQuarterLabel}</span>
          )}
        </div>
        <StatusBadge status={task.status} />
      </div>

      {/* Název úkolu */}
      <h3 className="font-semibold text-card-foreground mb-2 leading-snug">{task.title}</h3>

      {/* Kategorie tagy */}
      {(segmentLabel || deliveryLabel) && (
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {segmentLabel && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{segmentLabel}</span>
          )}
          {deliveryLabel && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{deliveryLabel}</span>
          )}
        </div>
      )}

      {/* Popis – zkrácený */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>

      {/* Zpoždění indikátor */}
      {task.delayReason && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{task.delayReason}</span>
        </div>
      )}

      {/* Miniatury obrázků */}
      {images.length > 0 && (
        <div className="mb-3">
          <ImageLightbox images={images} />
        </div>
      )}

      {/* Spodní řádek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {owner && <TeamAvatar member={owner} size="sm" />}
          {participants.length > 0 && (
            <div className="flex -space-x-1.5">
              {participants.slice(0, 3).map((p) => (
                <TeamAvatar key={p.id} member={p} size="sm" className="ring-2 ring-card" />
              ))}
              {participants.length > 3 && (
                <span className="w-7 h-7 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center ring-2 ring-card">
                  +{participants.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {format(new Date(task.dueDate), "d. MMM", { locale: cs })}
          </span>
          {onDuplicate && (
            <button className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors" onClick={(e) => { e.stopPropagation(); onDuplicate(task); }} title="Duplikovat">
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors" onClick={(e) => { e.stopPropagation(); onEdit(task); }} title="Upravit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} title="Smazat">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
