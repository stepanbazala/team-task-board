/**
 * Dashboard – prezentační pohled pro vedení
 * Top-level filtry (stejné jako správa), filtr zobrazení sekcí, PDF export
 * Klikatelné metriky/grafy → overlay s úkoly
 */

import { useState, useMemo, useRef } from "react";
import { Task, STATUS_LABELS, TaskStatus, QuarterDef, CategoryDef } from "@/types/task";
import { getTasks, getMembers, getQuarters, getSegments, getDeliveryTypes } from "@/services/storage";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { TaskListOverlay } from "@/components/TaskListOverlay";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, CheckCircle2, Clock, ListTodo, TrendingUp, Timer, Zap, Hourglass, RotateCcw, Eye, X, Filter, FileDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PIE_COLORS = ["hsl(214, 80%, 40%)", "hsl(36, 95%, 50%)", "hsl(152, 60%, 40%)"];
const MEMBER_BAR_COLORS = {
  "K řešení": "hsl(214, 80%, 40%)",
  "Probíhá": "hsl(36, 95%, 50%)",
  "Hotovo": "hsl(152, 60%, 40%)",
};

type SectionKey = "counter" | "stats" | "time" | "pieChart" | "quarterChart" | "memberChart" | "segmentChart" | "deliveryChart" | "taskList";

const SECTION_LABELS: Record<SectionKey, string> = {
  counter: "Počítadlo dokončených",
  stats: "Statistické karty",
  time: "Časové statistiky",
  pieChart: "Rozložení úkolů (koláč)",
  quarterChart: "Postup dle kvartálů",
  memberChart: "Úkoly dle členů (graf)",
  segmentChart: "Úkoly dle segmentů",
  deliveryChart: "Úkoly dle dodávek",
  taskList: "Úkoly dle členů (seznam)",
};

const ALL_SECTIONS: SectionKey[] = Object.keys(SECTION_LABELS) as SectionKey[];

const STATUS_MAP: Record<string, TaskStatus> = {
  "K řešení": "todo",
  "Probíhá": "in-progress",
  "Hotovo": "done",
};

function sortQuarters(quarters: QuarterDef[]): QuarterDef[] {
  return [...quarters].sort((a, b) => {
    const parse = (l: string) => { const m = l.match(/Q(\d)\/(\d{4})/i); return m ? { q: +m[1], y: +m[2] } : { q: 0, y: 0 }; };
    const pa = parse(a.label), pb = parse(b.label);
    if (pa.y !== pb.y) return pb.y - pa.y;
    return pa.q - pb.q;
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement>(null);
  const [tasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [quarters] = useState<QuarterDef[]>(getQuarters);
  const [segments] = useState<CategoryDef[]>(getSegments);
  const [deliveryTypes] = useState<CategoryDef[]>(getDeliveryTypes);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [visibleSections, setVisibleSections] = useState<SectionKey[]>(ALL_SECTIONS);
  const [exporting, setExporting] = useState(false);

  /* Filtry – stejné jako ve správě */
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedDeliveryTypeId, setSelectedDeliveryTypeId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /* Overlay pro drill-down */
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlayTasks, setOverlayTasks] = useState<Task[]>([]);

  const toggleQuarter = (qId: string) => {
    setSelectedQuarters((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const toggleSection = (key: SectionKey) => {
    setVisibleSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isVisible = (key: SectionKey) => visibleSections.includes(key);

  const activeFilterCount = [
    selectedQuarters.length > 0,
    !!selectedOwnerId,
    !!selectedSegmentId,
    !!selectedDeliveryTypeId,
  ].filter(Boolean).length;

  /** Filtrování dat */
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchQ = selectedQuarters.length === 0 ||
        selectedQuarters.includes(t.quarterId) ||
        (t.newQuarterId && selectedQuarters.includes(t.newQuarterId));
      const matchOwner = !selectedOwnerId || t.ownerId === selectedOwnerId;
      const matchSegment = !selectedSegmentId || t.segmentId === selectedSegmentId;
      const matchDelivery = !selectedDeliveryTypeId || t.deliveryTypeId === selectedDeliveryTypeId;
      return matchQ && matchOwner && matchSegment && matchDelivery;
    });
  }, [tasks, selectedQuarters, selectedOwnerId, selectedSegmentId, selectedDeliveryTypeId]);

  const stats = useMemo(() => {
    const todo = filtered.filter((t) => t.status === "todo").length;
    const inProgress = filtered.filter((t) => t.status === "in-progress").length;
    const done = filtered.filter((t) => t.status === "done").length;
    const total = filtered.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, total, completionRate };
  }, [filtered]);

  const timeStats = useMemo(() => {
    const doneTasks = filtered.filter((t) => t.status === "done" && t.startDate);
    const durations = doneTasks.map((t) => differenceInDays(new Date(t.dueDate), new Date(t.startDate!)));
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const shortest = durations.length > 0 ? Math.min(...durations) : 0;
    const longest = durations.length > 0 ? Math.max(...durations) : 0;
    const carriedOver = filtered.filter((t) => t.delayReason).length;
    return { avg, shortest, longest, carriedOver, doneTasks, shortestTask: doneTasks.find((t) => differenceInDays(new Date(t.dueDate), new Date(t.startDate!)) === shortest), longestTask: doneTasks.find((t) => differenceInDays(new Date(t.dueDate), new Date(t.startDate!)) === longest) };
  }, [filtered]);

  const pieData = useMemo(() => [
    { name: STATUS_LABELS["todo"], value: stats.todo },
    { name: STATUS_LABELS["in-progress"], value: stats.inProgress },
    { name: STATUS_LABELS["done"], value: stats.done },
  ], [stats]);

  const barData = useMemo(() =>
    quarters.map((q) => {
      const qTasks = tasks.filter((t) => t.quarterId === q.id);
      return {
        name: q.label, id: q.id,
        "K řešení": qTasks.filter((t) => t.status === "todo").length,
        "Probíhá": qTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": qTasks.filter((t) => t.status === "done").length,
      };
    }), [tasks, quarters]
  );

  const memberBarData = useMemo(() =>
    members.map((m) => {
      const mTasks = filtered.filter((t) => t.ownerId === m.id);
      return {
        id: m.id, name: m.initials, fullName: m.name,
        "K řešení": mTasks.filter((t) => t.status === "todo").length,
        "Probíhá": mTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": mTasks.filter((t) => t.status === "done").length,
      };
    }), [filtered, members]
  );

  const segmentBarData = useMemo(() =>
    segments.map((s) => {
      const sTasks = filtered.filter((t) => t.segmentId === s.id);
      return {
        id: s.id, name: s.label,
        "K řešení": sTasks.filter((t) => t.status === "todo").length,
        "Probíhá": sTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": sTasks.filter((t) => t.status === "done").length,
      };
    }), [filtered, segments]
  );

  const deliveryBarData = useMemo(() =>
    deliveryTypes.map((d) => {
      const dTasks = filtered.filter((t) => t.deliveryTypeId === d.id);
      return {
        id: d.id, name: d.label,
        "K řešení": dTasks.filter((t) => t.status === "todo").length,
        "Probíhá": dTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": dTasks.filter((t) => t.status === "done").length,
      };
    }), [filtered, deliveryTypes]
  );

  const tasksByMember = useMemo(() => {
    const map = new Map<string, Task[]>();
    members.forEach((m) => map.set(m.id, []));
    filtered.forEach((t) => {
      const arr = map.get(t.ownerId);
      if (arr) arr.push(t);
    });
    return map;
  }, [filtered, members]);

  const findMember = (id: string) => members.find((m) => m.id === id);
  const sortedQuarters = sortQuarters(quarters);

  const openOverlay = (title: string, tasks: Task[]) => {
    setOverlayTitle(title);
    setOverlayTasks(tasks);
    setOverlayOpen(true);
  };

  const handleStatClick = (status: TaskStatus, label: string) => {
    openOverlay(label, filtered.filter((t) => t.status === status));
  };

  const handlePieClick = (_: any, index: number) => {
    const statusKeys: TaskStatus[] = ["todo", "in-progress", "done"];
    const status = statusKeys[index];
    openOverlay(STATUS_LABELS[status], filtered.filter((t) => t.status === status));
  };

  const handleQuarterBarClick = (data: any, statusLabel: string) => {
    const qId = data?.id;
    if (!qId) return;
    const status = STATUS_MAP[statusLabel];
    const qLabel = quarters.find((q) => q.id === qId)?.label || "";
    openOverlay(`${qLabel} – ${statusLabel}`, tasks.filter((t) => t.quarterId === qId && t.status === status));
  };

  const handleCategoryBarClick = (data: any, statusLabel: string, categoryType: string) => {
    const catId = data?.id;
    if (!catId) return;
    const status = STATUS_MAP[statusLabel];
    const catName = data?.name || "";
    const catTasks = filtered.filter((t) => {
      const matchCat = categoryType === "segment" ? t.segmentId === catId : t.deliveryTypeId === catId;
      return matchCat && t.status === status;
    });
    openOverlay(`${catName} – ${statusLabel}`, catTasks);
  };

  const handleMemberBarClick = (data: any, statusLabel: string) => {
    const mId = data?.id;
    if (!mId) return;
    const status = STATUS_MAP[statusLabel];
    const member = findMember(mId);
    openOverlay(`${member?.name || mId} – ${statusLabel}`, filtered.filter((t) => t.ownerId === mId && t.status === status));
  };

  /** Export do PDF */
  const handleExportPDF = async () => {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f5f6f8",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`dashboard-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Přehled pro vedení</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
              <FileDown className="w-4 h-4 mr-1" /> {exporting ? "Exportuji..." : "Export PDF"}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" /> Filtr zobrazení
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <p className="text-sm font-semibold mb-3">Zobrazit sekce</p>
                <div className="space-y-2">
                  {ALL_SECTIONS.map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={isVisible(key)} onCheckedChange={() => toggleSection(key)} />
                      {SECTION_LABELS[key]}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Správa
            </Button>
          </div>
        </div>
      </header>

      {/* Filtry – stejné jako ve správě */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
        {/* Kvartální filtr */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium mr-1">Období:</span>
          <Button variant={selectedQuarters.length === 0 ? "default" : "outline"} size="sm" onClick={() => setSelectedQuarters([])}>Vše</Button>
          {sortedQuarters.map((q) => (
            <Button key={q.id} variant={selectedQuarters.includes(q.id) ? "default" : "outline"} size="sm" onClick={() => toggleQuarter(q.id)}>{q.label}</Button>
          ))}
        </div>

        {/* Collapsible rozšířené filtry */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="w-4 h-4" />
              Filtrovat
              {activeFilterCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{activeFilterCount}</span>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Osoba */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-muted-foreground font-medium mr-1">Osoba:</span>
              <Button variant={!selectedOwnerId ? "default" : "outline"} size="sm" onClick={() => setSelectedOwnerId(null)}>Všichni</Button>
              {members.map((m) => (
                <Button key={m.id} variant={selectedOwnerId === m.id ? "default" : "outline"} size="sm" onClick={() => setSelectedOwnerId(selectedOwnerId === m.id ? null : m.id)} className="gap-1.5">
                  <TeamAvatar member={m} size="sm" />
                  {m.initials}
                </Button>
              ))}
            </div>
            {/* Segment */}
            {segments.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-muted-foreground font-medium mr-1">Segment:</span>
                <Button variant={!selectedSegmentId ? "default" : "outline"} size="sm" onClick={() => setSelectedSegmentId(null)}>Vše</Button>
                {segments.map((s) => (
                  <Button key={s.id} variant={selectedSegmentId === s.id ? "default" : "outline"} size="sm" onClick={() => setSelectedSegmentId(selectedSegmentId === s.id ? null : s.id)}>{s.label}</Button>
                ))}
              </div>
            )}
            {/* Dodávka */}
            {deliveryTypes.length > 0 && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-muted-foreground font-medium mr-1">Dodávka:</span>
                <Button variant={!selectedDeliveryTypeId ? "default" : "outline"} size="sm" onClick={() => setSelectedDeliveryTypeId(null)}>Vše</Button>
                {deliveryTypes.map((d) => (
                  <Button key={d.id} variant={selectedDeliveryTypeId === d.id ? "default" : "outline"} size="sm" onClick={() => setSelectedDeliveryTypeId(selectedDeliveryTypeId === d.id ? null : d.id)}>{d.label}</Button>
                ))}
              </div>
            )}
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedOwnerId(null); setSelectedSegmentId(null); setSelectedDeliveryTypeId(null); }}>
                <X className="w-4 h-4 mr-1" /> Zrušit filtry
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Obsah dashboardu – ref pro PDF export */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-2 space-y-8 pb-8">
        {/* Velké počítadlo */}
        {isVisible("counter") && (
          <div className="george-card p-8 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => openOverlay("Celkem dokončeno", filtered.filter((t) => t.status === "done"))}>
            <p className="text-sm text-muted-foreground mb-1">Celkem dokončeno</p>
            <p className="text-6xl font-bold text-primary">{stats.done}</p>
            <p className="text-lg text-muted-foreground mt-1">z {stats.total} úkolů ({stats.completionRate}%)</p>
          </div>
        )}

        {/* Statistické karty */}
        {isVisible("stats") && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<ListTodo className="w-5 h-5" />} label="K řešení" value={stats.todo} color="text-primary" onClick={() => handleStatClick("todo", "K řešení")} />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Probíhá" value={stats.inProgress} color="text-[hsl(36,95%,50%)]" onClick={() => handleStatClick("in-progress", "Probíhá")} />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Hotovo" value={stats.done} color="text-[hsl(152,60%,40%)]" onClick={() => handleStatClick("done", "Hotovo")} />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Splnění" value={`${stats.completionRate}%`} color="text-[hsl(152,60%,30%)]" />
          </div>
        )}

        {/* Časové statistiky */}
        {isVisible("time") && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Timer className="w-5 h-5" />} label="Ø doba zpracování" value={`${timeStats.avg} dní`} color="text-primary" onClick={() => openOverlay("Dokončené úkoly", timeStats.doneTasks)} />
            <StatCard icon={<Zap className="w-5 h-5" />} label="Nejkratší úkol" value={`${timeStats.shortest} dní`} color="text-[hsl(152,60%,40%)]" onClick={() => { if (timeStats.shortestTask) setDetailTask(timeStats.shortestTask); }} />
            <StatCard icon={<Hourglass className="w-5 h-5" />} label="Nejdelší úkol" value={`${timeStats.longest} dní`} color="text-[hsl(36,95%,50%)]" onClick={() => { if (timeStats.longestTask) setDetailTask(timeStats.longestTask); }} />
            <StatCard icon={<RotateCcw className="w-5 h-5" />} label="Zpožděné úkoly" value={timeStats.carriedOver} color="text-destructive" onClick={() => openOverlay("Zpožděné úkoly", filtered.filter((t) => t.delayReason))} />
          </div>
        )}

        {/* Grafy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isVisible("pieChart") && (
            <div className="george-card p-6">
              <h3 className="font-semibold mb-4">Rozložení úkolů</h3>
              <p className="text-xs text-muted-foreground mb-3">Klikněte na výseč pro zobrazení úkolů</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} cursor="pointer" onClick={handlePieClick}>
                    {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {isVisible("quarterChart") && (
            <div className="george-card p-6">
              <h3 className="font-semibold mb-4">Postup dle kvartálů</h3>
              <p className="text-xs text-muted-foreground mb-3">Klikněte na sloupec pro zobrazení úkolů</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleQuarterBarClick(data, "K řešení")} />
                  <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleQuarterBarClick(data, "Probíhá")} />
                  <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleQuarterBarClick(data, "Hotovo")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Segmenty a dodávky */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isVisible("segmentChart") && segments.length > 0 && (
            <div className="george-card p-6">
              <h3 className="font-semibold mb-4">Úkoly dle segmentů</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={segmentBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "K řešení", "segment")} />
                  <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "Probíhá", "segment")} />
                  <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "Hotovo", "segment")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {isVisible("deliveryChart") && deliveryTypes.length > 0 && (
            <div className="george-card p-6">
              <h3 className="font-semibold mb-4">Úkoly dle dodávek</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deliveryBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "K řešení", "delivery")} />
                  <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "Probíhá", "delivery")} />
                  <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleCategoryBarClick(data, "Hotovo", "delivery")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Členové týmu – graf */}
        {isVisible("memberChart") && (
          <div className="george-card p-6">
            <h3 className="font-semibold mb-4">Úkoly dle členů týmu</h3>
            <p className="text-xs text-muted-foreground mb-3">Klikněte na sloupec pro zobrazení úkolů</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value, name) => [value, name]} labelFormatter={(label) => {
                  const item = memberBarData.find((d) => d.name === label);
                  return item?.fullName || label;
                }} />
                <Legend />
                <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleMemberBarClick(data, "K řešení")} />
                <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleMemberBarClick(data, "Probíhá")} />
                <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(data: any) => handleMemberBarClick(data, "Hotovo")} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Seznam úkolů dle členů */}
        {isVisible("taskList") && (
          <div className="george-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold text-lg">Úkoly dle členů týmu</h3>
              <p className="text-sm text-muted-foreground mt-1">Klikněte na úkol pro zobrazení detailu</p>
            </div>

            {members.map((member) => {
              const memberTasks = tasksByMember.get(member.id) || [];
              if (memberTasks.length === 0 && selectedQuarters.length > 0) return null;

              return (
                <div key={member.id} className="border-b border-border last:border-b-0">
                  <div className="flex items-center gap-3 px-6 py-4 bg-secondary/30">
                    <TeamAvatar member={member} size="md" />
                    <div>
                      <span className="font-semibold">{member.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({memberTasks.length} {memberTasks.length === 1 ? "úkol" : "úkolů"})
                      </span>
                    </div>
                  </div>

                  {memberTasks.length > 0 ? (
                    <div className="divide-y divide-border">
                      {memberTasks.map((task) => {
                        const segmentLabel = task.segmentId ? segments.find((s) => s.id === task.segmentId)?.label : undefined;
                        const deliveryLabel = task.deliveryTypeId ? deliveryTypes.find((d) => d.id === task.deliveryTypeId)?.label : undefined;
                        return (
                          <div
                            key={task.id}
                            className="px-6 py-3 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors"
                            onClick={() => setDetailTask(task)}
                          >
                            <StatusBadge status={task.status} />
                            <span className="flex-1 font-medium text-sm">{task.title}</span>
                            {segmentLabel && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary hidden sm:block">{segmentLabel}</span>
                            )}
                            {deliveryLabel && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground hidden sm:block">{deliveryLabel}</span>
                            )}
                            <span className="text-xs text-primary font-semibold">
                              {quarters.find((q) => q.id === task.quarterId)?.label || ""}
                            </span>
                            {task.newQuarterId && (
                              <span className="text-xs text-destructive font-semibold">
                                → {quarters.find((q) => q.id === task.newQuarterId)?.label || ""}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {format(new Date(task.dueDate), "d. MMM yyyy", { locale: cs })}
                            </span>
                            {task.delayReason && (
                              <span className="text-xs text-destructive hidden sm:block">⚠ zpožděno</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-6 py-4 text-sm text-muted-foreground">Žádné přiřazené úkoly</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overlay s úkoly */}
      <TaskListOverlay
        open={overlayOpen}
        onOpenChange={setOverlayOpen}
        title={overlayTitle}
        tasks={overlayTasks}
        members={members}
        quarters={quarters}
        segments={segments}
        deliveryTypes={deliveryTypes}
      />

      {/* Detail úkolu */}
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

function StatCard({ icon, label, value, color, onClick }: { icon: React.ReactNode; label: string; value: string | number; color: string; onClick?: () => void }) {
  return (
    <div className={`george-card p-5 animate-fade-in ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={onClick}>
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
