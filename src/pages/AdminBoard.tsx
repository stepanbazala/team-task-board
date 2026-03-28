/**
 * AdminBoard – hlavní stránka pro správu úkolů (kanban board)
 * Drag & drop mezi sloupci, multi-kvartál filtr, správa členů i kvartálů
 */

import { useState, useCallback } from "react";
import { Task, TaskStatus, STATUS_LABELS, QuarterDef } from "@/types/task";
import { getTasks, getMembers, getQuarters, createTask, updateTask, deleteTask } from "@/services/storage";
import { TaskCard } from "@/components/TaskCard";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { QuarterManagerDialog } from "@/components/QuarterManagerDialog";
import { MemberManagerDialog } from "@/components/MemberManagerDialog";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Settings, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];

export default function AdminBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(getTasks);
  const [members, setMembers] = useState(getMembers);
  const [quarters, setQuarters] = useState<QuarterDef[]>(getQuarters);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);

  // Dialogy
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [quartersDialogOpen, setQuartersDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const refresh = useCallback(() => {
    setTasks(getTasks());
    setMembers(getMembers());
    setQuarters(getQuarters());
  }, []);

  /** Filtrované úkoly podle vybraných kvartálů */
  const filteredTasks = selectedQuarters.length === 0
    ? tasks
    : tasks.filter((t) => selectedQuarters.includes(t.quarterId));

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  /** Toggle kvartál ve filtru */
  const toggleQuarter = (qId: string) => {
    setSelectedQuarters((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  /** Drag & drop handler */
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    const taskId = result.draggableId;
    updateTask(taskId, { status: newStatus });
    refresh();
    toast.success(`Úkol přesunut do "${STATUS_LABELS[newStatus]}"`);
  };

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

  const handleDelete = (taskId: string) => {
    if (window.confirm("Opravdu chcete smazat tento úkol?")) {
      deleteTask(taskId);
      toast.success("Úkol byl smazán");
      refresh();
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setMembersDialogOpen(true)}>
              <Users className="w-4 h-4 mr-1" /> Tým
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuartersDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-1" /> Kvartály
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" /> Nový úkol
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

      {/* Kanban sloupce s drag & drop */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATUSES.map((status) => {
              const columnTasks = tasksByStatus(status);
              return (
                <div key={status}>
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

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[120px] rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/50" : ""}`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={snapshot.isDragging ? "opacity-90" : ""}
                              >
                                <TaskCard
                                  task={task}
                                  owner={findMember(task.ownerId)}
                                  participants={task.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
                                  quarters={quarters}
                                  onEdit={handleEdit}
                                  onDelete={handleDelete}
                                  onClick={setDetailTask}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="george-card p-6 text-center text-sm text-muted-foreground">
                            Žádné úkoly
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Dialogy */}
      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        members={members}
        quarters={quarters}
        onSave={handleSave}
      />
      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={() => setDetailTask(null)}
        task={detailTask}
        owner={detailTask ? findMember(detailTask.ownerId) : undefined}
        participants={detailTask?.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
        quarters={quarters}
      />
      <QuarterManagerDialog
        open={quartersDialogOpen}
        onOpenChange={setQuartersDialogOpen}
        quarters={quarters}
        onChanged={refresh}
      />
      <MemberManagerDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        members={members}
        onChanged={refresh}
      />
    </div>
  );
}
