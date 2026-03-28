/**
 * SettingsDialog – spojený dialog pro správu kvartálů a členů týmu
 */

import { useState } from "react";
import { QuarterDef, TeamMember } from "@/types/task";
import { addQuarter, deleteQuarter, updateQuarter, addMember, updateMember, deleteMember } from "@/services/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamAvatar } from "@/components/TeamAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Check, X, CalendarDays, Users } from "lucide-react";
import { toast } from "sonner";

function makeInitials(name: string): string {
  return name.split(" ").map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 2);
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 65%, 45%)`;
}

/** Třídí kvartály podle roku a čísla (Q1/2026 < Q2/2026 < Q1/2027) */
function sortQuarters(quarters: QuarterDef[]): QuarterDef[] {
  return [...quarters].sort((a, b) => {
    const parseQ = (label: string) => {
      const match = label.match(/Q(\d)\/(\d{4})/i);
      if (!match) return { q: 0, y: 0 };
      return { q: parseInt(match[1]), y: parseInt(match[2]) };
    };
    const pa = parseQ(a.label);
    const pb = parseQ(b.label);
    if (pa.y !== pb.y) return pb.y - pa.y; // novější rok nahoře
    return pa.q - pb.q;
  });
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quarters: QuarterDef[];
  members: TeamMember[];
  onChanged: () => void;
}

export function SettingsDialog({ open, onOpenChange, quarters, members, onChanged }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [editQLabel, setEditQLabel] = useState("");

  const [newName, setNewName] = useState("");
  const [editingMId, setEditingMId] = useState<string | null>(null);
  const [editMName, setEditMName] = useState("");

  const sortedQuarters = sortQuarters(quarters);

  // --- Quarter handlers ---
  const handleAddQ = () => {
    if (!newLabel.trim()) return;
    addQuarter(newLabel.trim());
    setNewLabel("");
    onChanged();
    toast.success("Období přidáno");
  };
  const handleDeleteQ = (id: string) => {
    if (!window.confirm("Smazat toto období?")) return;
    deleteQuarter(id);
    onChanged();
    toast.success("Období smazáno");
  };
  const handleEditQSave = () => {
    if (!editingQId || !editQLabel.trim()) return;
    updateQuarter(editingQId, editQLabel.trim());
    setEditingQId(null);
    onChanged();
    toast.success("Období upraveno");
  };

  // --- Member handlers ---
  const handleAddM = () => {
    const name = newName.trim();
    if (!name) return;
    addMember({ name, initials: makeInitials(name), avatarColor: randomColor() });
    setNewName("");
    onChanged();
    toast.success("Člen přidán");
  };
  const handleDeleteM = (id: string) => {
    if (!window.confirm("Smazat tohoto člena?")) return;
    deleteMember(id);
    onChanged();
    toast.success("Člen odstraněn");
  };
  const handleEditMSave = () => {
    if (!editingMId || !editMName.trim()) return;
    updateMember(editingMId, { name: editMName.trim(), initials: makeInitials(editMName.trim()) });
    setEditingMId(null);
    onChanged();
    toast.success("Člen upraven");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nastavení</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quarters" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="quarters" className="flex-1 gap-1.5">
              <CalendarDays className="w-4 h-4" /> Období
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 gap-1.5">
              <Users className="w-4 h-4" /> Tým
            </TabsTrigger>
          </TabsList>

          {/* Období / Kvartály */}
          <TabsContent value="quarters" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Např. Q1/2027" onKeyDown={(e) => e.key === "Enter" && handleAddQ()} />
              <Button onClick={handleAddQ} size="sm"><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sortedQuarters.map((q) => (
                <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                  {editingQId === q.id ? (
                    <>
                      <Input value={editQLabel} onChange={(e) => setEditQLabel(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleEditQSave()} />
                      <button onClick={handleEditQSave} className="p-1 text-primary hover:bg-accent rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingQId(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{q.label}</span>
                      <button onClick={() => { setEditingQId(q.id); setEditQLabel(q.label); }} className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteQ(q.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Tým */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jméno a příjmení" onKeyDown={(e) => e.key === "Enter" && handleAddM()} />
              <Button onClick={handleAddM} size="sm"><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <TeamAvatar member={m} size="sm" />
                  {editingMId === m.id ? (
                    <>
                      <Input value={editMName} onChange={(e) => setEditMName(e.target.value)} className="h-8 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && handleEditMSave()} />
                      <button onClick={handleEditMSave} className="p-1 text-primary hover:bg-accent rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingMId(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">{m.name}</span>
                      <button onClick={() => { setEditingMId(m.id); setEditMName(m.name); }} className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteM(m.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
