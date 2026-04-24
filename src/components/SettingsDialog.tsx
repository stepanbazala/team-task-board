/**
 * SettingsDialog – spojený dialog pro správu kvartálů, členů, segmentů a druhů dodávky
 */

import { useState } from "react";
import { QuarterDef, TeamMember, CategoryDef } from "@/types/task";
import {
  addQuarter, deleteQuarter, updateQuarter,
  addMember, updateMember, deleteMember,
  addSegment, updateSegment, deleteSegment,
  addDeliveryType, updateDeliveryType, deleteDeliveryType,
} from "@/services/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TeamAvatar } from "@/components/TeamAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Check, X, CalendarDays, Users, Tag, Package } from "lucide-react";
import { toast } from "sonner";

function makeInitials(name: string): string {
  return name.split(" ").map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 2);
}

function randomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 65%, 45%)`;
}

/** Předvolená paleta barev pro avatary */
const COLOR_PALETTE = [
  "hsl(214, 80%, 40%)", // modrá
  "hsl(280, 60%, 50%)", // fialová
  "hsl(152, 60%, 40%)", // zelená
  "hsl(36, 95%, 50%)",  // oranžová
  "hsl(340, 70%, 50%)", // růžová
  "hsl(0, 70%, 50%)",   // červená
  "hsl(190, 75%, 42%)", // tyrkysová
  "hsl(48, 90%, 48%)",  // žlutá
  "hsl(258, 60%, 55%)", // indigo
  "hsl(120, 45%, 38%)", // tmavě zelená
  "hsl(15, 75%, 50%)",  // cihlová
  "hsl(220, 15%, 35%)", // šedá
];

/** Komponenta pro výběr barvy z palety */
function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            value === color ? "border-foreground scale-110" : "border-transparent"
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}

function sortQuarters(quarters: QuarterDef[]): QuarterDef[] {
  return [...quarters].sort((a, b) => {
    const parseQ = (label: string) => {
      const match = label.match(/Q(\d)\/(\d{4})/i);
      if (!match) return { q: 0, y: 0 };
      return { q: parseInt(match[1]), y: parseInt(match[2]) };
    };
    const pa = parseQ(a.label);
    const pb = parseQ(b.label);
    if (pa.y !== pb.y) return pb.y - pa.y;
    return pa.q - pb.q;
  });
}

/** Generická CRUD sekce pro jednoduché položky (kvartály, segmenty, druhy dodávky) */
function CrudSection({ items, onAdd, onUpdate, onDelete, placeholder, entityName }: {
  items: { id: string; label: string }[];
  onAdd: (label: string) => void;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  placeholder: string;
  entityName: string;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAdd(newLabel.trim());
    setNewLabel("");
    toast.success(`${entityName} přidán(a)`);
  };

  const handleSave = () => {
    if (!editingId || !editLabel.trim()) return;
    onUpdate(editingId, editLabel.trim());
    setEditingId(null);
    toast.success(`${entityName} upraven(a)`);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(`Smazat ${entityName.toLowerCase()}?`)) return;
    onDelete(id);
    toast.success(`${entityName} smazán(a)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder={placeholder} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} size="sm"><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            {editingId === item.id ? (
              <>
                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => e.key === "Enter" && handleSave()} />
                <button onClick={handleSave} className="p-1 text-primary hover:bg-accent rounded"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <button onClick={() => { setEditingId(item.id); setEditLabel(item.label); }} className="p-1 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(item.id)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quarters: QuarterDef[];
  members: TeamMember[];
  segments: CategoryDef[];
  deliveryTypes: CategoryDef[];
  onChanged: () => void;
}

export function SettingsDialog({ open, onOpenChange, quarters, members, segments, deliveryTypes, onChanged }: Props) {
  const [newName, setNewName] = useState("");
  const [editingMId, setEditingMId] = useState<string | null>(null);
  const [editMName, setEditMName] = useState("");

  const sortedQuarters = sortQuarters(quarters);

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
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="quarters" className="gap-1 text-xs px-1">
              <CalendarDays className="w-3.5 h-3.5" /> Období
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1 text-xs px-1">
              <Users className="w-3.5 h-3.5" /> Tým
            </TabsTrigger>
            <TabsTrigger value="segments" className="gap-1 text-xs px-1">
              <Tag className="w-3.5 h-3.5" /> Segmenty
            </TabsTrigger>
            <TabsTrigger value="deliveryTypes" className="gap-1 text-xs px-1">
              <Package className="w-3.5 h-3.5" /> Dodávky
            </TabsTrigger>
          </TabsList>

          {/* Období */}
          <TabsContent value="quarters" className="mt-4">
            <CrudSection
              items={sortedQuarters}
              onAdd={(label) => { addQuarter(label); onChanged(); }}
              onUpdate={(id, label) => { updateQuarter(id, label); onChanged(); }}
              onDelete={(id) => { deleteQuarter(id); onChanged(); }}
              placeholder="Např. Q1/2027"
              entityName="Období"
            />
          </TabsContent>

          {/* Tým */}
          <TabsContent value="members" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jméno a příjmení" onKeyDown={(e) => e.key === "Enter" && handleAddM()} />
              <Button onClick={handleAddM} size="sm"><Plus className="w-4 h-4 mr-1" /> Přidat</Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        className="rounded-full ring-offset-background transition hover:ring-2 hover:ring-ring hover:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        title="Změnit barvu"
                      >
                        <TeamAvatar member={m} size="sm" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Vyberte barvu</div>
                      <ColorPicker
                        value={m.avatarColor}
                        onChange={(color) => {
                          updateMember(m.id, { avatarColor: color });
                          onChanged();
                          toast.success("Barva změněna");
                        }}
                      />
                    </PopoverContent>
                  </Popover>
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

          {/* Segmenty */}
          <TabsContent value="segments" className="mt-4">
            <CrudSection
              items={segments}
              onAdd={(label) => { addSegment(label); onChanged(); }}
              onUpdate={(id, label) => { updateSegment(id, label); onChanged(); }}
              onDelete={(id) => { deleteSegment(id); onChanged(); }}
              placeholder="Např. Retail, Corporate..."
              entityName="Segment"
            />
          </TabsContent>

          {/* Druhy dodávky */}
          <TabsContent value="deliveryTypes" className="mt-4">
            <CrudSection
              items={deliveryTypes}
              onAdd={(label) => { addDeliveryType(label); onChanged(); }}
              onUpdate={(id, label) => { updateDeliveryType(id, label); onChanged(); }}
              onDelete={(id) => { deleteDeliveryType(id); onChanged(); }}
              placeholder="Např. Vývoj, Analýza..."
              entityName="Druh dodávky"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
