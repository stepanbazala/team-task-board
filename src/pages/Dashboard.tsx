/**
 * Dashboard – prezentační pohled pro vedení
 * Obsahuje souhrnné statistiky, graf postupu, tabulku úkolů dle členů
 */

import { useState, useMemo } from "react";
import { Task, Quarter, QUARTER_LABELS, STATUS_LABELS, TaskStatus } from "@/types/task";
import { getTasks, getMembers, getMemberById } from "@/services/storage";
import { TeamAvatar } from "@/components/TeamAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Clock, ListTodo, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
const PIE_COLORS = ["hsl(214, 80%, 40%)", "hsl(36, 95%, 50%)", "hsl(152, 60%, 40%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | "all">("all");
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  /** Filtrované úkoly */
  const filtered = useMemo(
    () => (selectedQuarter === "all" ? tasks : tasks.filter((t) => t.quarter === selectedQuarter)),
    [tasks, selectedQuarter]
  );

  /** Statistiky */
  const stats = useMemo(() => {
    const todo = filtered.filter((t) => t.status === "todo").length;
    const inProgress = filtered.filter((t) => t.status === "in-progress").length;
    const done = filtered.filter((t) => t.status === "done").length;
    const total = filtered.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { todo, inProgress, done, total, completionRate };
  }, [filtered]);

  /** Data pro pie chart */
  const pieData = useMemo(() => [
    { name: STATUS_LABELS["todo"], value: stats.todo },
    { name: STATUS_LABELS["in-progress"], value: stats.inProgress },
    { name: STATUS_LABELS["done"], value: stats.done },
  ], [stats]);

  /** Data pro bar chart – úkoly dle kvartálů */
  const barData = useMemo(() =>
    QUARTERS.map((q) => {
      const qTasks = tasks.filter((t) => t.quarter === q);
      return {
        name: q,
        "K řešení": qTasks.filter((t) => t.status === "todo").length,
        "Probíhá": qTasks.filter((t) => t.status === "in-progress").length,
        "Hotovo": qTasks.filter((t) => t.status === "done").length,
      };
    }), [tasks]
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
            <Select
              value={selectedQuarter}
              onValueChange={(v) => setSelectedQuarter(v as Quarter | "all")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny kvartály</SelectItem>
                {QUARTERS.map((q) => (
                  <SelectItem key={q} value={q}>{QUARTER_LABELS[q]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Správa
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Statistické karty */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<ListTodo className="w-5 h-5" />} label="K řešení" value={stats.todo} color="text-status-todo" />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Probíhá" value={stats.inProgress} color="text-status-progress" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Hotovo" value={stats.done} color="text-status-done" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Splnění" value={`${stats.completionRate}%`} color="text-success" />
        </div>

        {/* Grafy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart – rozložení stavů */}
          <div className="george-card p-6">
            <h3 className="font-semibold mb-4">Rozložení úkolů</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart – postup dle kvartálů */}
          <div className="george-card p-6">
            <h3 className="font-semibold mb-4">Postup dle kvartálů</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="K řešení" fill="hsl(214, 80%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Probíhá" fill="hsl(36, 95%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hotovo" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabulka úkolů dle členů */}
        <div className="george-card overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-lg">Úkoly dle členů týmu</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Klikněte na úkol pro zobrazení detailu
            </p>
          </div>

          {members.map((member) => {
            const memberTasks = tasksByMember.get(member.id) || [];
            if (memberTasks.length === 0 && selectedQuarter !== "all") return null;

            return (
              <div key={member.id} className="border-b border-border last:border-b-0">
                {/* Hlavička člena */}
                <div className="flex items-center gap-3 px-6 py-4 bg-secondary/30">
                  <TeamAvatar member={member} size="md" />
                  <div>
                    <span className="font-semibold">{member.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({memberTasks.length} {memberTasks.length === 1 ? "úkol" : "úkolů"})
                    </span>
                  </div>
                </div>

                {/* Úkoly */}
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
                        <span className="text-xs text-primary font-semibold">{task.quarter}</span>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {format(new Date(task.dueDate), "d. MMM yyyy", { locale: cs })}
                        </span>
                        {task.imageUrl && (
                          <img
                            src={task.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded object-cover hidden sm:block"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-4 text-sm text-muted-foreground">
                    Žádné přiřazené úkoly
                  </div>
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
