/**
 * TaskFormDialog – modální dialog pro vytvoření/editaci úkolu
 */

import { useState, useEffect, useRef } from "react";
import { Task, TaskStatus, QuarterDef, STATUS_LABELS, TeamMember } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamAvatar } from "@/components/TeamAvatar";
import { ImagePlus, X } from "lucide-react";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  members: TeamMember[];
  quarters: QuarterDef[];
  onSave: (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
}

export function TaskFormDialog({ open, onOpenChange, task, members, quarters, onSave }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [quarterId, setQuarterId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [newQuarterId, setNewQuarterId] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setQuarterId(task.quarterId);
      setOwnerId(task.ownerId);
      setParticipantIds(task.participantIds);
      setDueDate(task.dueDate);
      setStartDate(task.startDate || "");
      setDelayReason(task.delayReason || "");
      setNewQuarterId(task.newQuarterId);
      setImageUrl(task.imageUrl);
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setQuarterId(quarters[0]?.id || "");
      setOwnerId(members[0]?.id || "");
      setParticipantIds([]);
      setDueDate("");
      setStartDate("");
      setDelayReason("");
      setNewQuarterId(undefined);
      setImageUrl(undefined);
    }
  }, [task, open, members, quarters]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ownerId || !dueDate) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      quarterId,
      ownerId,
      participantIds: participantIds.filter((id) => id !== ownerId),
      dueDate,
      startDate: startDate || undefined,
      delayReason: delayReason.trim() || undefined,
      newQuarterId: delayReason.trim() ? newQuarterId : undefined,
      imageUrl,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {task ? "Upravit úkol" : "Nový úkol"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Název */}
          <div className="space-y-2">
            <Label htmlFor="title">Název úkolu *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Např. Redesign hlavní stránky" required />
          </div>

          {/* Popis */}
          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailní popis úkolu..." rows={3} />
          </div>

          {/* Stav + Dodání */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stav</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dodání</Label>
              <Select value={quarterId} onValueChange={setQuarterId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {quarters.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Termíny */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Datum zahájení</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Termín dokončení *</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          {/* Důvod zpoždění */}
          <div className="space-y-2">
            <Label htmlFor="delayReason">Důvod zpoždění</Label>
            <Textarea id="delayReason" value={delayReason} onChange={(e) => setDelayReason(e.target.value)} placeholder="Vyplňte pokud se úkol zpožďuje..." rows={2} />
          </div>

          {/* Nově plánované dodání – zobrazí se jen když je vyplněn důvod zpoždění */}
          {delayReason.trim() && (
            <div className="space-y-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <Label>Nově plánované dodání</Label>
              <Select value={newQuarterId || ""} onValueChange={(v) => setNewQuarterId(v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Vyberte nové období" /></SelectTrigger>
                <SelectContent>
                  {quarters.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Zodpovědná osoba */}
          <div className="space-y-2">
            <Label>Zodpovědná osoba *</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger><SelectValue placeholder="Vyberte osobu" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <TeamAvatar member={m} size="sm" />
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participanti */}
          <div className="space-y-2">
            <Label>Účastníci</Label>
            <div className="space-y-2">
              {members.filter((m) => m.id !== ownerId).map((m) => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={participantIds.includes(m.id)} onCheckedChange={() => toggleParticipant(m.id)} />
                  <TeamAvatar member={m} size="sm" />
                  <span className="text-sm">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Obrázek */}
          <div className="space-y-2">
            <Label>Příloha (obrázek)</Label>
            {imageUrl ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={imageUrl} alt="Náhled" className="w-full h-40 object-cover" />
                <button type="button" onClick={() => setImageUrl(undefined)} className="absolute top-2 right-2 p-1 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">Nahrát obrázek</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{task ? "Uložit změny" : "Vytvořit úkol"}</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
