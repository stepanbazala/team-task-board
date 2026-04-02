/**
 * BoardView – Tabule: maticový pohled na úkoly
 * Řádky = kvartály, Sloupce = druhy dodávky
 * Drag & drop pro přesuny, zpožděné úkoly jen v newQuarterId
 */

import { useState, useMemo, useCallback, DragEvent } from "react";
import { Task, TaskStatus, STATUS_LABELS, QuarterDef, CategoryDef, TeamMember } from "@/types/task";
import { getTasks, getMembers, getQuarters, getSegments, getDeliveryTypes, updateTask, createTask, deleteTask } from "@/services/storage";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Filter, X, Search, LayoutDashboard, AlertTriangle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function sortQuarters(quarters: QuarterDef[]): QuarterDef[] {
  return [...quarters].sort((a, b) => {
    const parse = (l: string) => { const m = l.match(/Q(\d)\/(\d{4})/i); return m ? { q: +m[1], y: +m[2] } : { q: 0, y: 0 }; };
    const pa = parse(a.label), pb = parse(b.label);
    if (pa.y !== pb.y) return pb.y - pa.y;
    return pa.q - pb.q;
  });
}

export default function BoardView() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [quarters] = useState<QuarterDef[]>(getQuarters);
  const [segments] = useState<CategoryDef[]>(getSegments);
  const [deliveryTypes] = useState<CategoryDef[]>(getDeliveryTypes);

  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedDeliveryTypes, setSelectedDeliveryTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);

  const sortedQuarters = sortQuarters(quarters);

  const activeFilterCount = [
    selectedQuarters.length > 0,
    selectedDeliveryTypes.length > 0,
    selectedStatuses.length > 0,
    !!selectedOwnerId,
    !!selectedSegmentId,
  ].filter(Boolean).length;

  const toggle = <T,>(list: T[], item: T) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  const visibleQuarters = useMemo(() => {
    if (selectedQuarters.length === 0) return sortedQuarters;
    return sortedQuarters.filter((q) => selectedQuarters.includes(q.id));
  }, [sortedQuarters, selectedQuarters]);

  const visibleDeliveryTypes = useMemo(() => {
    if (selectedDeliveryTypes.length === 0) return deliveryTypes;
    return deliveryTypes.filter((dt) => selectedDeliveryTypes.includes(dt.id));
  }, [deliveryTypes, selectedDeliveryTypes]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchOwner = !selectedOwnerId || t.ownerId === selectedOwnerId;
      const matchSegment = !selectedSegmentId || t.segmentId === selectedSegmentId;
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(t.status);
      const matchSearch = !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchOwner && matchSegment && matchStatus && matchSearch;
    });
  }, [tasks, selectedOwnerId, selectedSegmentId, selectedStatuses, searchQuery]);

  // Delayed tasks: show only in newQuarterId cell
  const getCellTasks = (quarterId: string, deliveryTypeId: string) => {
    return filteredTasks.filter((t) => {
      const isDelayed = Boolean(t.newQuarterId);
      const inQuarter = isDelayed ? t.newQuarterId === quarterId : t.quarterId === quarterId;
      const inDelivery = t.deliveryTypeId === deliveryTypeId;
      return inQuarter && inDelivery;
    });
  };

  const getUncategorizedTasks = (quarterId: string) => {
    return filteredTasks.filter((t) => {
      const isDelayed = Boolean(t.newQuarterId);
      const inQuarter = isDelayed ? t.newQuarterId === quarterId : t.quarterId === quarterId;
      return inQuarter && !t.deliveryTypeId;
    });
  };

  const findMember = (id: string) => members.find((m) => m.id === id);
  const isDelayed = (task: Task) => Boolean(task.delayReason || task.newQuarterId);

  const clearFilters = () => {
    setSelectedQuarters([]);
    setSelectedDeliveryTypes([]);
    setSelectedStatuses([]);
    setSelectedOwnerId(null);
    setSelectedSegmentId(null);
    setSearchQuery("");
  };

  // Drag & drop
  const handleDragStart = (e: DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = useCallback((e: DragEvent, targetQuarterId: string, targetDeliveryTypeId: string | null) => {
    e.preventDefault();
    setDragOverCell(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updates: Partial<Task> = {};
    // Determine current effective quarter
    const currentQ = task.newQuarterId || task.quarterId;
    if (currentQ !== targetQuarterId) {
      // If task has newQuarterId, update that; otherwise update quarterId
      if (task.newQuarterId) {
        updates.newQuarterId = targetQuarterId;
      } else {
        updates.quarterId = targetQuarterId;
      }
    }
    if (task.deliveryTypeId !== (targetDeliveryTypeId || undefined)) {
      updates.deliveryTypeId = targetDeliveryTypeId || undefined;
    }

    if (Object.keys(updates).length === 0) return;

    const updated = updateTask(taskId, updates);
    if (updated) {
      setTasks(getTasks());
      toast.success("Úkol přesunut");
    }
  }, [tasks]);

  const handleDragOver = (e: DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => setDragOverCell(null);

  const allStatuses: TaskStatus[] = ["todo", "in-progress", "done"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tabule</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Maticový přehled úkolů</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Správa
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat úkoly..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <Filter className="w-4 h-4 mr-1" /> Filtrovat
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Zrušit filtry
            </Button>
          )}
        </div>

        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* Quarters */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Kvartály (řádky)</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedQuarters.map((q) => (
                  <Button key={q.id} size="sm" variant={selectedQuarters.includes(q.id) ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedQuarters(toggle(selectedQuarters, q.id))}>
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Delivery types */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Dodávky (sloupce)</p>
              <div className="flex flex-wrap gap-1.5">
                {deliveryTypes.map((dt) => (
                  <Button key={dt.id} size="sm" variant={selectedDeliveryTypes.includes(dt.id) ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedDeliveryTypes(toggle(selectedDeliveryTypes, dt.id))}>
                    {dt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Stav</p>
              <div className="flex flex-wrap gap-1.5">
                {allStatuses.map((s) => (
                  <Button key={s} size="sm" variant={selectedStatuses.includes(s) ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedStatuses(toggle(selectedStatuses, s))}>
                    {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Owner */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Zodpovědná osoba</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <Button key={m.id} size="sm" variant={selectedOwnerId === m.id ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedOwnerId(selectedOwnerId === m.id ? null : m.id)}>
                    <TeamAvatar member={m} size="sm" className="w-4 h-4 mr-1 text-[8px]" />
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Segment */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Segment</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <Button key={s.id} size="sm" variant={selectedSegmentId === s.id ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedSegmentId(selectedSegmentId === s.id ? null : s.id)}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Matrix */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-8">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-[5] bg-background p-3 text-left text-sm font-semibold text-foreground border-b border-border min-w-[120px]">
                  Kvartál
                </th>
                {visibleDeliveryTypes.map((dt) => (
                  <th key={dt.id} className="p-3 text-left text-sm font-semibold text-foreground border-b border-border min-w-[220px]">
                    {dt.label}
                  </th>
                ))}
                <th className="p-3 text-left text-sm font-semibold text-muted-foreground border-b border-border min-w-[220px]">
                  Bez dodávky
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleQuarters.map((q) => (
                <tr key={q.id} className="border-b border-border">
                  <td className="sticky left-0 z-[5] bg-background p-3 align-top">
                    <span className="text-sm font-bold text-primary">{q.label}</span>
                  </td>
                  {visibleDeliveryTypes.map((dt) => {
                    const cellId = `${q.id}__${dt.id}`;
                    const cellTasks = getCellTasks(q.id, dt.id);
                    const isOver = dragOverCell === cellId;
                    return (
                      <td
                        key={dt.id}
                        className={`p-2 align-top border-l border-border transition-colors ${isOver ? "bg-primary/10" : ""}`}
                        onDragOver={(e) => handleDragOver(e, cellId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, q.id, dt.id)}
                      >
                        <div className="space-y-1.5 min-h-[60px]">
                          {cellTasks.map((task) => (
                            <MiniTaskCard
                              key={task.id}
                              task={task}
                              owner={findMember(task.ownerId)}
                              delayed={isDelayed(task)}
                              onClick={() => setDetailTask(task)}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            />
                          ))}
                          {cellTasks.length === 0 && (
                            <div className="h-[60px] rounded-lg border border-dashed border-border/50 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground/50">—</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {/* Uncategorized */}
                  {(() => {
                    const cellId = `${q.id}__uncategorized`;
                    const uncatTasks = getUncategorizedTasks(q.id);
                    const isOver = dragOverCell === cellId;
                    return (
                      <td
                        className={`p-2 align-top border-l border-border transition-colors ${isOver ? "bg-primary/10" : ""}`}
                        onDragOver={(e) => handleDragOver(e, cellId)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, q.id, null)}
                      >
                        <div className="space-y-1.5 min-h-[60px]">
                          {uncatTasks.map((task) => (
                            <MiniTaskCard
                              key={task.id}
                              task={task}
                              owner={findMember(task.ownerId)}
                              delayed={isDelayed(task)}
                              onClick={() => setDetailTask(task)}
                              onDragStart={(e) => handleDragStart(e, task.id)}
                            />
                          ))}
                        </div>
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>

          {visibleQuarters.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              Žádné kvartály k zobrazení. Upravte filtry.
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
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
    </div>
  );
}

/* ─── Mini Task Card ─── */
function MiniTaskCard({ task, owner, delayed, onClick, onDragStart }: {
  task: Task;
  owner?: TeamMember;
  delayed: boolean;
  onClick: () => void;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
  const delayedClass = delayed
    ? "border-2 border-dashed border-warning bg-warning/10"
    : "border border-border bg-card";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${delayedClass}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-card-foreground truncate">{task.title}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={task.status} />
            {owner && <TeamAvatar member={owner} size="sm" className="w-4 h-4 text-[7px]" />}
          </div>
        </div>
        {delayed && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />}
      </div>
    </div>
  );
}
