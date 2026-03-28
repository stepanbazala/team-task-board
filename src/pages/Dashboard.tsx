/**
 * Dashboard – prezentační pohled pro vedení
 * Přepínání viditelnosti sekcí, klik na osobu = filtr, detaily úkolů
 */

import { useState, useMemo } from "react";
import { Task, STATUS_LABELS, TaskStatus, QuarterDef } from "@/types/task";
import { getTasks, getMembers, getQuarters } from "@/services/storage";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, ListTodo, TrendingUp, Timer, Zap, Hourglass, RotateCcw, Eye, EyeOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const PIE_COLORS = ["hsl(214, 80%, 40%)", "hsl(36, 95%, 50%)", "hsl(152, 60%, 40%)"];
const MEMBER_BAR_COLORS = {
  "K řešení": "hsl(214, 80%, 40%)",
  "Probíhá": "hsl(36, 95%, 50%)",
  "Hotovo": "hsl(152, 60%, 40%)",
};

type SectionKey = "counter" | "stats" | "time" | "pieChart" | "quarterChart" | "memberChart" | "taskList";

const SECTION_LABELS: Record<SectionKey, string> = {
  counter: "Počítadlo dokončených",
  stats: "Statistické karty",
  time: "Časové statistiky",
  pieChart: "Rozložení úkolů (koláč)",
  quarterChart: "Postup dle kvartálů",
  memberChart: "Úkoly dle členů (graf)",
  taskList: "Úkoly dle členů (seznam)",
};

const ALL_SECTIONS: SectionKey[] = Object.keys(SECTION_LABELS) as SectionKey[];

/** Třídí kvartály */
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
  const [tasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [quarters] = useState<QuarterDef[]>(getQuarters);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [visibleSections, setVisibleSections] = useState<SectionKey[]>(ALL_SECTIONS);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

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

  const filtered = useMemo(
    () => selectedQuarters.length === 0 ? tasks : tasks.filter((t) =>
      selectedQuarters.includes(t.quarterId) || (t.newQuarterId && selectedQuarters.includes(t.newQuarterId))
    ),
    [tasks, selectedQuarters]
  );

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
    return { avg, shortest, longest, carriedOver };
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
        name: q.label,
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
        id: m.id,
        name: m.initials,
        fullName: m.name,
        "K řešení": mTasks.filter((t) => t.status === "todo").length,
        "Probíhá": mTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": mTasks.filter((t) => t.status === "done").length,
      };
    }), [filtered, members]
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

  /** Klik na bar v grafu – filtr dle člena */
  const handleBarClick = (data: any) => {
    if (!data?.id) return;
    setSelectedMemberId((prev) => prev === data.id ? null : data.id);
  };

  /** Filtr členů pro zobrazení v seznamu */
  const displayMembers = selectedMemberId
    ? members.filter((m) => m.id === selectedMemberId)
    : members;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Přehled pro vedení</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Tlačítko pro výběr sekcí */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" /> Zobrazení
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

            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Správa
            </Button>
          </div>
        </div>
      </header>

      {/* Multi-kvartál filtr */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedQuarters.length === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedQuarters([])}
          >
            Vše
          </Button>
          {sortedQuarters.map((q) => (
            <Button
              key={q.id}
              variant={selectedQuarters.includes(q.id) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleQuarter(q.id)}
            >
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 space-y-8">
        {/* Velké počítadlo */}
        {isVisible("counter") && (
          <div className="george-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-1">Celkem dokončeno</p>
            <p className="text-6xl font-bold text-primary">{stats.done}</p>
            <p className="text-lg text-muted-foreground mt-1">z {stats.total} úkolů ({stats.completionRate}%)</p>
          </div>
        )}

        {/* Statistické karty */}
        {isVisible("stats") && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<ListTodo className="w-5 h-5" />} label="K řešení" value={stats.todo} color="text-primary" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="Probíhá" value={stats.inProgress} color="text-[hsl(36,95%,50%)]" />
            <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Hotovo" value={stats.done} color="text-[hsl(152,60%,40%)]" />
            <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Splnění" value={`${stats.completionRate}%`} color="text-[hsl(152,60%,30%)]" />
          </div>
        )}

        {/* Časové statistiky */}
        {isVisible("time") && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Timer className="w-5 h-5" />} label="Ø doba zpracování" value={`${timeStats.avg} dní`} color="text-primary" />
            <StatCard icon={<Zap className="w-5 h-5" />} label="Nejkratší úkol" value={`${timeStats.shortest} dní`} color="text-[hsl(152,60%,40%)]" />
            <StatCard icon={<Hourglass className="w-5 h-5" />} label="Nejdelší úkol" value={`${timeStats.longest} dní`} color="text-[hsl(36,95%,50%)]" />
            <StatCard icon={<RotateCcw className="w-5 h-5" />} label="Zpožděné úkoly" value={timeStats.carriedOver} color="text-destructive" />
          </div>
        )}

        {/* Grafy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isVisible("pieChart") && (
            <div className="george-card p-6">
              <h3 className="font-semibold mb-4">Rozložení úkolů</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Graf – úkoly dle lidí (klikatelný) */}
        {isVisible("memberChart") && (
          <div className="george-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Úkoly dle členů týmu</h3>
              {selectedMemberId && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedMemberId(null)}>
                  <X className="w-4 h-4 mr-1" /> Zrušit filtr
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">Klikněte na sloupec pro filtrování</p>
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
                <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick} />
                <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick} />
                <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} cursor="pointer" onClick={handleBarClick} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabulka úkolů dle členů */}
        {isVisible("taskList") && (
          <div className="george-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Úkoly dle členů týmu</h3>
                  <p className="text-sm text-muted-foreground mt-1">Klikněte na úkol pro zobrazení detailu</p>
                </div>
                {selectedMemberId && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedMemberId(null)}>
                    <X className="w-4 h-4 mr-1" /> Zobrazit vše
                  </Button>
                )}
              </div>
            </div>

            {displayMembers.map((member) => {
              const memberTasks = tasksByMember.get(member.id) || [];
              if (memberTasks.length === 0 && selectedQuarters.length > 0) return null;

              return (
                <div key={member.id} className="border-b border-border last:border-b-0">
                  <div
                    className="flex items-center gap-3 px-6 py-4 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => setSelectedMemberId((prev) => prev === member.id ? null : member.id)}
                  >
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
                      {memberTasks.map((task) => (
                        <div
                          key={task.id}
                          className="px-6 py-3 flex items-center gap-4 hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => setDetailTask(task)}
                        >
                          <StatusBadge status={task.status} />
                          <span className="flex-1 font-medium text-sm">{task.title}</span>
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
                      ))}
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

      {/* Detail úkolu */}
      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={() => setDetailTask(null)}
        task={detailTask}
        owner={detailTask ? findMember(detailTask.ownerId) : undefined}
        participants={detailTask?.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
        quarters={quarters}
      />
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="george-card p-5 animate-fade-in">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
