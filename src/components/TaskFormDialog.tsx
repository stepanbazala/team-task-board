/**
 * TaskFormDialog – modální dialog pro vytvoření/editaci úkolu
 * Obsahuje formulář se všemi atributy úkolu
 */

import { useState, useEffect, useRef } from "react";
import { Task, TaskStatus, Quarter, STATUS_LABELS, QUARTER_LABELS, TeamMember } from "@/types/task";
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
  onSave: (data: Omit<Task, "id" | "createdAt" | "updatedAt">) => void;
}

export function TaskFormDialog({ open, onOpenChange, task, members, onSave }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [quarter, setQuarter] = useState<Quarter>("Q1");
  const [ownerId, setOwnerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Při otevření dialogu naplníme formulář daty (editace) nebo vynulujeme (nový)
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setQuarter(task.quarter);
      setOwnerId(task.ownerId);
      setParticipantIds(task.participantIds);
      setDueDate(task.dueDate);
      setImageUrl(task.imageUrl);
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setQuarter("Q1");
      setOwnerId(members[0]?.id || "");
      setParticipantIds([]);
      setDueDate("");
      setImageUrl(undefined);
    }
  }, [task, open, members]);

  /** Nahrání obrázku – převod na Base64 */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /** Toggle účastníka */
  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  /** Odeslání formuláře */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !ownerId || !dueDate) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      quarter,
      ownerId,
      participantIds: participantIds.filter((id) => id !== ownerId),
      dueDate,
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
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Např. Redesign hlavní stránky"
              required
            />
          </div>

          {/* Popis */}
          <div className="space-y-2">
            <Label htmlFor="description">Popis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailní popis úkolu..."
              rows={3}
            />
          </div>

          {/* Stav + Kvartál */}
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
              <Label>Kvartál</Label>
              <Select value={quarter} onValueChange={(v) => setQuarter(v as Quarter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUARTER_LABELS) as Quarter[]).map((q) => (
                    <SelectItem key={q} value={q}>{QUARTER_LABELS[q]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Termín */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Termín dokončení *</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

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
              {members
                .filter((m) => m.id !== ownerId)
                .map((m) => (
                  <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={participantIds.includes(m.id)}
                      onCheckedChange={() => toggleParticipant(m.id)}
                    />
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
                <button
                  type="button"
                  onClick={() => setImageUrl(undefined)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-foreground/60 text-background hover:bg-foreground/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">Nahrát obrázek</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">
              {task ? "Uložit změny" : "Vytvořit úkol"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
