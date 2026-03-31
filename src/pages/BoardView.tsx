/**
 * BoardView – Tabule: maticový pohled na úkoly
 * Řádky = kvartály, Sloupce = druhy dodávky
 * Minimální karty s možností prokliknutí na detail
 */

import { useState, useMemo } from "react";
import { Task, TaskStatus, STATUS_LABELS, QuarterDef, CategoryDef } from "@/types/task";
import { getTasks, getMembers, getQuarters, getSegments, getDeliveryTypes } from "@/services/storage";
import { StatusBadge } from "@/components/StatusBadge";
import { TeamAvatar } from "@/components/TeamAvatar";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Filter, X, Search, LayoutDashboard, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

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
  const [tasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [quarters] = useState<QuarterDef[]>(getQuarters);
  const [segments] = useState<CategoryDef[]>(getSegments);
  const [deliveryTypes] = useState<CategoryDef[]>(getDeliveryTypes);

  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedDeliveryTypes, setSelectedDeliveryTypes] = useState<string[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const sortedQuarters = sortQuarters(quarters);

  const activeFilterCount = [
    selectedQuarters.length > 0,
    selectedDeliveryTypes.length > 0,
    !!selectedOwnerId,
    !!selectedSegmentId,
  ].filter(Boolean).length;

  const toggleQuarter = (qId: string) =>
    setSelectedQuarters((prev) => prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]);

  const toggleDeliveryType = (dtId: string) =>
    setSelectedDeliveryTypes((prev) => prev.includes(dtId) ? prev.filter((id) => id !== dtId) : [...prev, dtId]);

  // Visible quarters & delivery types for the matrix
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
      const matchQ = selectedQuarters.length === 0 ||
        selectedQuarters.includes(t.quarterId) ||
        (t.newQuarterId && selectedQuarters.includes(t.newQuarterId));
      const matchOwner = !selectedOwnerId || t.ownerId === selectedOwnerId;
      const matchSegment = !selectedSegmentId || t.segmentId === selectedSegmentId;
      const matchSearch = !searchQuery.trim() ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchQ && matchOwner && matchSegment && matchSearch;
    });
  }, [tasks, selectedQuarters, selectedOwnerId, selectedSegmentId, searchQuery]);

  // Get tasks for a specific quarter + delivery type cell
  const getCellTasks = (quarterId: string, deliveryTypeId: string) => {
    return filteredTasks.filter((t) => {
      const inQuarter = t.quarterId === quarterId || (t.newQuarterId === quarterId);
      const inDelivery = t.deliveryTypeId === deliveryTypeId;
      return inQuarter && inDelivery;
    });
  };

  // Tasks without delivery type (uncategorized)
  const getUncategorizedTasks = (quarterId: string) => {
    return filteredTasks.filter((t) => {
      const inQuarter = t.quarterId === quarterId || (t.newQuarterId === quarterId);
      return inQuarter && !t.deliveryTypeId;
    });
  };

  const findMember = (id: string) => members.find((m) => m.id === id);

  const isDelayed = (task: Task) => Boolean(task.delayReason || task.newQuarterId);

  const clearFilters = () => {
    setSelectedQuarters([]);
    setSelectedDeliveryTypes([]);
    setSelectedOwnerId(null);
    setSelectedSegmentId(null);
    setSearchQuery("");
  };

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
            {/* Quarter filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Kvartály (řádky)</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedQuarters.map((q) => (
                  <Button
                    key={q.id}
                    size="sm"
                    variant={selectedQuarters.includes(q.id) ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => toggleQuarter(q.id)}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Delivery type filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Dodávky (sloupce)</p>
              <div className="flex flex-wrap gap-1.5">
                {deliveryTypes.map((dt) => (
                  <Button
                    key={dt.id}
                    size="sm"
                    variant={selectedDeliveryTypes.includes(dt.id) ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => toggleDeliveryType(dt.id)}
                  >
                    {dt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Owner filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Zodpovědná osoba</p>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => (
                  <Button
                    key={m.id}
                    size="sm"
                    variant={selectedOwnerId === m.id ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setSelectedOwnerId(selectedOwnerId === m.id ? null : m.id)}
                  >
                    <TeamAvatar member={m} size="sm" className="w-4 h-4 mr-1 text-[8px]" />
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Segment filter */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Segment</p>
              <div className="flex flex-wrap gap-1.5">
                {segments.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={selectedSegmentId === s.id ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setSelectedSegmentId(selectedSegmentId === s.id ? null : s.id)}
                  >
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
                {/* Uncategorized column */}
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
                    const cellTasks = getCellTasks(q.id, dt.id);
                    return (
                      <td key={dt.id} className="p-2 align-top border-l border-border">
                        <div className="space-y-1.5 min-h-[60px]">
                          {cellTasks.map((task) => (
                            <MiniTaskCard
                              key={task.id}
                              task={task}
                              owner={findMember(task.ownerId)}
                              delayed={isDelayed(task)}
                              onClick={() => setDetailTask(task)}
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
                  <td className="p-2 align-top border-l border-border">
                    <div className="space-y-1.5 min-h-[60px]">
                      {getUncategorizedTasks(q.id).map((task) => (
                        <MiniTaskCard
                          key={task.id}
                          task={task}
                          owner={findMember(task.ownerId)}
                          delayed={isDelayed(task)}
                          onClick={() => setDetailTask(task)}
                        />
                      ))}
                    </div>
                  </td>
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
import { TeamMember } from "@/types/task";
import { AlertTriangle } from "lucide-react";

function MiniTaskCard({ task, owner, delayed, onClick }: {
  task: Task;
  owner?: TeamMember;
  delayed: boolean;
  onClick: () => void;
}) {
  const delayedClass = delayed
    ? "border-2 border-dashed border-destructive bg-destructive/10"
    : "border border-border bg-card";

  return (
    <div
      className={`rounded-lg p-2.5 cursor-pointer hover:shadow-md transition-all ${delayedClass}`}
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
        {delayed && <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
      </div>
    </div>
  );
}
