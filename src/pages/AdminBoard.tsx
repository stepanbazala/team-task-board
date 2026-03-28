/**
 * AdminBoard – hlavní stránka pro správu úkolů (kanban board)
 * Obsahuje sloupce podle stavů, filtrování dle kvartálů a CRUD operace
 */

import { useState, useCallback } from "react";
import { Task, TaskStatus, Quarter, STATUS_LABELS, QUARTER_LABELS } from "@/types/task";
import { getTasks, getMembers, createTask, updateTask, deleteTask } from "@/services/storage";
import { TaskCard } from "@/components/TaskCard";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];
const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

export default function AdminBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(getTasks);
  const [members] = useState(getMembers);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | "all">("all");

  // Dialogy
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);

  /** Obnovit data z localStorage */
  const refresh = useCallback(() => setTasks(getTasks()), []);

  /** Filtrované úkoly podle kvartálu */
  const filteredTasks = selectedQuarter === "all"
    ? tasks
    : tasks.filter((t) => t.quarter === selectedQuarter);

  /** Úkoly seskupené podle stavu */
  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  /** Uložení úkolu (vytvoření nebo editace) */
  const handleSave = (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
      toast.success("Úkol byl upraven");
    } else {
      createTask(data);
      toast.success("Úkol byl vytvořen");
    }
    setEditingTask(null);
    refresh();
  };

  /** Smazání úkolu */
  const handleDelete = (taskId: string) => {
    if (window.confirm("Opravdu chcete smazat tento úkol?")) {
      deleteTask(taskId);
      toast.success("Úkol byl smazán");
      refresh();
    }
  };

  /** Otevřít formulář pro editaci */
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  /** Otevřít nový formulář */
  const handleNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  /** Najít člena podle ID */
  const findMember = (id: string) => members.find((m) => m.id === id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Správa úkolů</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Týmový pracovní board</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Prezentace
            </Button>
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nový úkol
            </Button>
          </div>
        </div>
      </header>

      {/* Filtr kvartálů */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedQuarter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedQuarter("all")}
          >
            Vše
          </Button>
          {QUARTERS.map((q) => (
            <Button
              key={q}
              variant={selectedQuarter === q ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedQuarter(q)}
            >
              {QUARTER_LABELS[q]}
            </Button>
          ))}
        </div>
      </div>

      {/* Kanban sloupce */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STATUSES.map((status) => {
            const columnTasks = tasksByStatus(status);
            return (
              <div key={status}>
                {/* Hlavička sloupce */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        status === "todo" ? "hsl(var(--status-todo))" :
                        status === "in-progress" ? "hsl(var(--status-progress))" :
                        "hsl(var(--status-done))",
                    }}
                  />
                  <h2 className="font-semibold text-foreground">{STATUS_LABELS[status]}</h2>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Karty */}
                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      owner={findMember(task.ownerId)}
                      participants={task.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onClick={setDetailTask}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="george-card p-6 text-center text-sm text-muted-foreground">
                      Žádné úkoly
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialogy */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        members={members}
        onSave={handleSave}
      />
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
