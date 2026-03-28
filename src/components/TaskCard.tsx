/**
 * TaskCard – karta úkolu pro kanban board
 * Zobrazuje název, stav, zodpovědnou osobu a termín
 */

import { Task, TeamMember, QuarterDef } from "@/types/task";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface TaskCardProps {
  task: Task;
  owner?: TeamMember;
  participants?: TeamMember[];
  quarters: QuarterDef[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, owner, participants = [], quarters, onEdit, onDelete, onClick }: TaskCardProps) {
  const quarterLabel = quarters.find((q) => q.id === task.quarterId)?.label || task.quarterId;

  return (
    <div
      className="george-card-hover p-4 cursor-pointer animate-fade-in"
      onClick={() => onClick(task)}
    >
      {/* Horní řádek: kvartál + stav */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-primary">{quarterLabel}</span>
        <StatusBadge status={task.status} />
      </div>

      {/* Název úkolu */}
      <h3 className="font-semibold text-card-foreground mb-2 leading-snug">
        {task.title}
      </h3>

      {/* Popis – zkrácený */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {task.description}
      </p>

      {/* Zpoždění indikátor */}
      {task.delayReason && (
        <div className="flex items-center gap-1.5 text-xs text-destructive mb-3">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="line-clamp-1">{task.delayReason}</span>
        </div>
      )}

      {/* Náhled obrázku */}
      {task.imageUrl && (
        <div className="mb-3 rounded-lg overflow-hidden">
          <img
            src={task.imageUrl}
            alt="Příloha úkolu"
            className="w-full h-32 object-cover"
          />
        </div>
      )}

      {/* Spodní řádek: avatar + termín + akce */}
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
          <button
            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Upravit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            title="Smazat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
