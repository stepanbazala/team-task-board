/**
 * MemberManagerDialog – správa členů týmu (přidání, editace, smazání)
 */

import { useState } from "react";
import { TeamMember } from "@/types/task";
import { addMember, updateMember, deleteMember } from "@/services/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TeamAvatar } from "@/components/TeamAvatar";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

/** Vygeneruje iniciály z celého jména */
function makeInitials(name: string): string {
  return name.split(" ").map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 2);
}

/** Náhodná HSL barva */
function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 65%, 45%)`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  onChanged: () => void;
}

export function MemberManagerDialog({ open, onOpenChange, members, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    addMember({ name, initials: makeInitials(name), avatarColor: randomColor() });
    setNewName("");
    onChanged();
    toast.success("Člen přidán");
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Smazat tohoto člena? Úkoly přiřazené tomuto členovi zůstanou.")) return;
    deleteMember(id);
    onChanged();
    toast.success("Člen odstraněn");
  };

  const handleEditStart = (m: TeamMember) => {
    setEditingId(m.id);
    setEditName(m.name);
  };

  const handleEditSave = () => {
    if (!editingId || !editName.trim()) return;
    updateMember(editingId, { name: editName.trim(), initials: makeInitials(editName.trim()) });
    setEditingId(null);
    onChanged();
    toast.success("Člen upraven");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Správa členů týmu</DialogTitle>
        </DialogHeader>

        {/* Přidat nového */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Jméno a příjmení"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Přidat
          </Button>
        </div>

        {/* Seznam */}
        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <TeamAvatar member={m} size="sm" />
              {editingId === m.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && handleEditSave()} />
                  <button onClick={handleEditSave} className="p-1 text-primary hover:bg-accent rounded"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  <button onClick={() => handleEditStart(m)} className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(m.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
