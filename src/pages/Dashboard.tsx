/**
 * Dashboard – prezentační pohled pro vedení
 * Multi-kvartál filtr, grafy, statistiky, časové údaje
 */

import { useState, useMemo } from "react";
import { Task, STATUS_LABELS, TaskStatus, QuarterDef } from "@/types/task";
import { getTasks, getMembers, getQuarters } from "@/services/storage";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, ListTodo, TrendingUp, Timer, Zap, Hourglass, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [quarters] = useState<QuarterDef[]>(getQuarters);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  const toggleQuarter = (qId: string) => {
    setSelectedQuarters((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  /** Filtrované úkoly */
  const filtered = useMemo(
    () => selectedQuarters.length === 0 ? tasks : tasks.filter((t) => selectedQuarters.includes(t.quarterId)),
    [tasks, selectedQuarters]
  );

  /** Základní statistiky */
  const stats = useMemo(() => {
    const todo = filtered.filter((t) => t.status === "todo").length;
    const inProgress = filtered.filter((t) => t.status === "in-progress").length;
    const done = filtered.filter((t) => t.status === "done").length;
    const total = filtered.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, total, completionRate };
  }, [filtered]);

  /** Časové statistiky */
  const timeStats = useMemo(() => {
    const doneTasks = filtered.filter((t) => t.status === "done" && t.startDate);
    const durations = doneTasks.map((t) => differenceInDays(new Date(t.dueDate), new Date(t.startDate!)));
    const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const shortest = durations.length > 0 ? Math.min(...durations) : 0;
    const longest = durations.length > 0 ? Math.max(...durations) : 0;

    // "Přesunuté z předchozího kvartálu" – úkoly, jejichž dueDate leží v jiném kvartálu, než ke kterému jsou přiřazené
    // Zjednodušená heuristika: pokud startDate existuje a je dřívější než začátek aktuálního kvartálu, počítáme je
    const carriedOver = filtered.filter((t) => t.delayReason).length;

    return { avg, shortest, longest, carriedOver };
  }, [filtered]);

  /** Data pro pie chart */
  const pieData = useMemo(() => [
    { name: STATUS_LABELS["todo"], value: stats.todo },
    { name: STATUS_LABELS["in-progress"], value: stats.inProgress },
    { name: STATUS_LABELS["done"], value: stats.done },
  ], [stats]);

  /** Data pro bar chart – úkoly dle kvartálů */
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

  /** Data pro graf – úkoly dle lidí */
  const memberBarData = useMemo(() =>
    members.map((m) => {
      const mTasks = filtered.filter((t) => t.ownerId === m.id);
      return {
        name: m.initials,
        fullName: m.name,
        "K řešení": mTasks.filter((t) => t.status === "todo").length,
        "Probíhá": mTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": mTasks.filter((t) => t.status === "done").length,
      };
    }), [filtered, members]
  );

  /** Úkoly seskupené dle členů */
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
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Správa
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
          {quarters.map((q) => (
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
        {/* Velké počítadlo hotových úkolů */}
        <div className="george-card p-8 text-center">
          <p className="text-sm text-muted-foreground mb-1">Celkem dokončeno</p>
          <p className="text-6xl font-bold text-primary">{stats.done}</p>
          <p className="text-lg text-muted-foreground mt-1">z {stats.total} úkolů ({stats.completionRate}%)</p>
        </div>

        {/* Statistické karty */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<ListTodo className="w-5 h-5" />} label="K řešení" value={stats.todo} color="text-primary" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Probíhá" value={stats.inProgress} color="text-[hsl(36,95%,50%)]" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Hotovo" value={stats.done} color="text-[hsl(152,60%,40%)]" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Splnění" value={`${stats.completionRate}%`} color="text-[hsl(152,60%,30%)]" />
        </div>

        {/* Časové statistiky */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Timer className="w-5 h-5" />} label="Ø doba zpracování" value={`${timeStats.avg} dní`} color="text-primary" />
          <StatCard icon={<Zap className="w-5 h-5" />} label="Nejkratší úkol" value={`${timeStats.shortest} dní`} color="text-[hsl(152,60%,40%)]" />
          <StatCard icon={<Hourglass className="w-5 h-5" />} label="Nejdelší úkol" value={`${timeStats.longest} dní`} color="text-[hsl(36,95%,50%)]" />
          <StatCard icon={<RotateCcw className="w-5 h-5" />} label="Zpožděné úkoly" value={timeStats.carriedOver} color="text-destructive" />
        </div>

        {/* Grafy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
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

          {/* Bar Chart – kvartály */}
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
        </div>

        {/* Graf – úkoly dle lidí */}
        <div className="george-card p-6">
          <h3 className="font-semibold mb-4">Úkoly dle členů týmu</h3>
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
              <Bar dataKey="K řešení" fill={MEMBER_BAR_COLORS["K řešení"]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Probíhá" fill={MEMBER_BAR_COLORS["Probíhá"]} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hotovo" fill={MEMBER_BAR_COLORS["Hotovo"]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabulka úkolů dle členů */}
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

/** Statistická karta */
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="george-card p-5 animate-fade-in">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
