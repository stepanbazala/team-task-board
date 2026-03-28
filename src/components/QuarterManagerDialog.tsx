/**
 * QuarterManagerDialog – správa kvartálů (přidání, editace, smazání)
 */

import { useState } from "react";
import { QuarterDef } from "@/types/task";
import { addQuarter, deleteQuarter, updateQuarter } from "@/services/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quarters: QuarterDef[];
  onChanged: () => void;
}

export function QuarterManagerDialog({ open, onOpenChange, quarters, onChanged }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    addQuarter(newLabel.trim());
    setNewLabel("");
    onChanged();
    toast.success("Kvartál přidán");
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Smazat tento kvartál? Úkoly přiřazené k němu zůstanou.")) return;
    deleteQuarter(id);
    onChanged();
    toast.success("Kvartál smazán");
  };

  const handleEditStart = (q: QuarterDef) => {
    setEditingId(q.id);
    setEditLabel(q.label);
  };

  const handleEditSave = () => {
    if (!editingId || !editLabel.trim()) return;
    updateQuarter(editingId, editLabel.trim());
    setEditingId(null);
    onChanged();
    toast.success("Kvartál upraven");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Správa kvartálů</DialogTitle>
        </DialogHeader>

        {/* Přidat nový */}
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Např. Q1/2027"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Přidat
          </Button>
        </div>

        {/* Seznam */}
        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
          {quarters.map((q) => (
            <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              {editingId === q.id ? (
                <>
                  <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleEditSave()} />
                  <button onClick={handleEditSave} className="p-1 text-primary hover:bg-accent rounded"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{q.label}</span>
                  <button onClick={() => handleEditStart(q)} className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(q.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
