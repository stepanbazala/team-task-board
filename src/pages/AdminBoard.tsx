/**
 * AdminBoard – hlavní stránka pro správu úkolů (kanban board)
 * Drag & drop, multi-kvartál filtr, filtr dle vlastníka, správa nastavení, duplikace, kategorie
 */

import { useState, useCallback } from "react";
import { Task, TaskStatus, STATUS_LABELS, QuarterDef, CategoryDef } from "@/types/task";
import { getTasks, getMembers, getQuarters, getSegments, getDeliveryTypes, createTask, updateTask, deleteTask } from "@/services/storage";
import { TaskCard } from "@/components/TaskCard";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TeamAvatar } from "@/components/TeamAvatar";
import { Button } from "@/components/ui/button";
import { Plus, LayoutDashboard, Settings, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];

function sortQuarterButtons(quarters: QuarterDef[]): QuarterDef[] {
  return [...quarters].sort((a, b) => {
    const parse = (label: string) => {
      const m = label.match(/Q(\d)\/(\d{4})/i);
      return m ? { q: parseInt(m[1]), y: parseInt(m[2]) } : { q: 0, y: 0 };
    };
    const pa = parse(a.label), pb = parse(b.label);
    if (pa.y !== pb.y) return pb.y - pa.y;
    return pa.q - pb.q;
  });
}

export default function AdminBoard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>(getTasks);
  const [members, setMembers] = useState(getMembers);
  const [quarters, setQuarters] = useState<QuarterDef[]>(getQuarters);
  const [segments, setSegments] = useState<CategoryDef[]>(getSegments);
  const [deliveryTypes, setDeliveryTypes] = useState<CategoryDef[]>(getDeliveryTypes);
  const [selectedQuarters, setSelectedQuarters] = useState<string[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(() => {
    setTasks(getTasks());
    setMembers(getMembers());
    setQuarters(getQuarters());
    setSegments(getSegments());
    setDeliveryTypes(getDeliveryTypes());
  }, []);

  /** Filtr: kvartál + vlastník */
  const filteredTasks = tasks.filter((t) => {
    const matchQ = selectedQuarters.length === 0 ||
      selectedQuarters.includes(t.quarterId) ||
      (t.newQuarterId && selectedQuarters.includes(t.newQuarterId));
    const matchOwner = !selectedOwnerId || t.ownerId === selectedOwnerId;
    return matchQ && matchOwner;
  });

  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  const isRescheduled = (task: Task) => {
    if (selectedQuarters.length === 0 || !task.newQuarterId) return false;
    return !selectedQuarters.includes(task.quarterId) && selectedQuarters.includes(task.newQuarterId);
  };

  const toggleQuarter = (qId: string) => {
    setSelectedQuarters((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

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

  /** Duplikace: pokud je vybraný kvartál filtr, zduplikovaný úkol dostane ten kvartál; vždy zůstane viditelný */
  const handleDuplicate = (task: Task) => {
    const targetQuarterId = selectedQuarters.length === 1 ? selectedQuarters[0] : task.quarterId;
    const newTask = createTask({
      title: `${task.title} (kopie)`,
      description: task.description,
      status: "todo",
      quarterId: targetQuarterId,
      ownerId: task.ownerId,
      participantIds: task.participantIds,
      dueDate: task.dueDate,
      startDate: undefined,
      delayReason: undefined,
      newQuarterId: undefined,
      imageUrls: task.imageUrls,
      segmentId: task.segmentId,
      deliveryTypeId: task.deliveryTypeId,
    });
    refresh();
    // Pokud duplikovaný úkol není vidět v aktuálním filtru, přepni na "Vše"
    if (selectedQuarters.length > 0 && !selectedQuarters.includes(targetQuarterId)) {
      setSelectedQuarters([]);
    }
    toast.success("Úkol byl duplikován");
  };

  const findMember = (id: string) => members.find((m) => m.id === id);
  const sortedQuarters = sortQuarterButtons(quarters);

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
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-1" /> Nastavení
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

      {/* Filtry: kvartály + vlastník */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-3">
        {/* Kvartální filtr */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium mr-1">Období:</span>
          <Button variant={selectedQuarters.length === 0 ? "default" : "outline"} size="sm" onClick={() => setSelectedQuarters([])}>Vše</Button>
          {sortedQuarters.map((q) => (
            <Button key={q.id} variant={selectedQuarters.includes(q.id) ? "default" : "outline"} size="sm" onClick={() => toggleQuarter(q.id)}>{q.label}</Button>
          ))}
        </div>
        {/* Filtr dle vlastníka */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium mr-1">Osoba:</span>
          <Button variant={!selectedOwnerId ? "default" : "outline"} size="sm" onClick={() => setSelectedOwnerId(null)}>Všichni</Button>
          {members.map((m) => (
            <Button
              key={m.id}
              variant={selectedOwnerId === m.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedOwnerId(selectedOwnerId === m.id ? null : m.id)}
              className="gap-1.5"
            >
              <TeamAvatar member={m} size="sm" />
              {m.initials}
            </Button>
          ))}
          {selectedOwnerId && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedOwnerId(null)}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Kanban sloupce */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STATUSES.map((status) => {
              const columnTasks = tasksByStatus(status);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full" style={{
                      backgroundColor: status === "todo" ? "hsl(var(--status-todo))" : status === "in-progress" ? "hsl(var(--status-progress))" : "hsl(var(--status-done))",
                    }} />
                    <h2 className="font-semibold text-foreground">{STATUS_LABELS[status]}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{columnTasks.length}</span>
                  </div>

                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-3 min-h-[120px] rounded-xl p-2 transition-colors ${snapshot.isDraggingOver ? "bg-accent/50" : ""}`}>
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? "opacity-90" : ""}>
                                <TaskCard
                                  task={task}
                                  owner={findMember(task.ownerId)}
                                  participants={task.participantIds.map((id) => findMember(id)).filter(Boolean) as any}
                                  quarters={quarters}
                                  segments={segments}
                                  deliveryTypes={deliveryTypes}
                                  isRescheduled={isRescheduled(task)}
                                  onEdit={handleEdit}
                                  onDelete={handleDelete}
                                  onDuplicate={handleDuplicate}
                                  onClick={setDetailTask}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="george-card p-6 text-center text-sm text-muted-foreground">Žádné úkoly</div>
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
      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editingTask} members={members} quarters={quarters} segments={segments} deliveryTypes={deliveryTypes} onSave={handleSave} />
      <TaskDetailDialog open={!!detailTask} onOpenChange={() => setDetailTask(null)} task={detailTask} owner={detailTask ? findMember(detailTask.ownerId) : undefined} participants={detailTask?.participantIds.map((id) => findMember(id)).filter(Boolean) as any} quarters={quarters} segments={segments} deliveryTypes={deliveryTypes} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} quarters={quarters} members={members} segments={segments} deliveryTypes={deliveryTypes} onChanged={refresh} />
    </div>
  );
}
