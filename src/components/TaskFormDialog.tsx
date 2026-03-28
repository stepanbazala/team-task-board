/**
 * TaskFormDialog – modální dialog pro vytvoření/editaci úkolu
 * Auto-save při kliknutí na pozadí, multi-image (max 6), kategorie
 */

import { useState, useEffect, useRef } from "react";
import { Task, TaskStatus, QuarterDef, STATUS_LABELS, TeamMember, CategoryDef } from "@/types/task";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TeamAvatar } from "@/components/TeamAvatar";
import { ImagePlus, X } from "lucide-react";

const MAX_IMAGES = 6;

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  members: TeamMember[];
  quarters: QuarterDef[];
  segments: CategoryDef[];
  deliveryTypes: CategoryDef[];
  onSave: (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
}

export function TaskFormDialog({ open, onOpenChange, task, members, quarters, segments, deliveryTypes, onSave }: TaskFormDialogProps) {
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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [segmentId, setSegmentId] = useState<string | undefined>();
  const [deliveryTypeId, setDeliveryTypeId] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

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
      setImageUrls(task.imageUrls || (task.imageUrl ? [task.imageUrl] : []));
      setSegmentId(task.segmentId);
      setDeliveryTypeId(task.deliveryTypeId);
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
      setImageUrls([]);
      setSegmentId(undefined);
      setDeliveryTypeId(undefined);
    }
    cancelRef.current = false;
  }, [task, open, members, quarters]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - imageUrls.length;
    const toProcess = files.slice(0, remaining);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrls((prev) => prev.length < MAX_IMAGES ? [...prev, reader.result as string] : prev);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const buildData = (): Omit<Task, "id" | "createdAt" | "updatedAt"> | null => {
    if (!title.trim() || !ownerId || !dueDate) return null;
    return {
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
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      segmentId,
      deliveryTypeId,
    };
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const data = buildData();
    if (!data) return;
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    cancelRef.current = true;
    onOpenChange(false);
  };

  /** Auto-save: při zavření dialogu (backdrop/escape) uložíme pokud nejde o cancel */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !cancelRef.current) {
      const data = buildData();
      if (data) {
        onSave(data);
      }
    }
    cancelRef.current = false;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => { e.preventDefault(); const data = buildData(); if (data) { onSave(data); } onOpenChange(false); }}>
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

          {/* Segment + Druh dodávky */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Segment</Label>
              <Select value={segmentId || "__none__"} onValueChange={(v) => setSegmentId(v === "__none__" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Bez segmentu —</SelectItem>
                  {segments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Druh dodávky</Label>
              <Select value={deliveryTypeId || "__none__"} onValueChange={(v) => setDeliveryTypeId(v === "__none__" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Bez typu —</SelectItem>
                  {deliveryTypes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
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

          {/* Nově plánované dodání */}
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

          {/* Obrázky – multi upload */}
          <div className="space-y-2">
            <Label>Přílohy – obrázky (max {MAX_IMAGES})</Label>
            <div className="flex gap-2 flex-wrap">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-border">
                  <img src={url} alt={`Příloha ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < MAX_IMAGES && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <ImagePlus className="w-5 h-5" />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{task ? "Uložit změny" : "Vytvořit úkol"}</Button>
            <Button type="button" variant="outline" onClick={handleCancel}>Zrušit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
