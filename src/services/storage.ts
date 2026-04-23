/**
 * Sdílené úložiště dat – Lovable Cloud (Supabase)
 *
 * Architektura:
 * - Při startu aplikace se zavolá `initStorage()`, která načte všechna data ze Supabase
 *   do in-memory cache a (jednorázově) naimportuje stávající localStorage data, pokud
 *   jsou v DB prázdné tabulky.
 * - Všechny `get*` funkce vracejí synchronně z cache → ostatní komponenty zůstaly beze změny.
 * - Všechny mutační funkce (`addX`, `updateX`, `deleteX`, `createTask`, `updateTask`, `deleteTask`)
 *   zapisují do Supabase a optimisticky aktualizují cache.
 * - Realtime subscription synchronizuje změny mezi všemi uživateli.
 */

import { Task, TeamMember, QuarterDef, CategoryDef } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";

// ==========================================
// Výchozí seed data (použije se jen pokud je DB úplně prázdná)
// ==========================================
const DEFAULT_QUARTERS: QuarterDef[] = [
  { id: "q1-2026", label: "Q1/2026" },
  { id: "q2-2026", label: "Q2/2026" },
  { id: "q3-2026", label: "Q3/2026" },
  { id: "q4-2026", label: "Q4/2026" },
];

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "m1", name: "Jan Novák", avatarColor: "hsl(214, 80%, 40%)", initials: "JN" },
  { id: "m2", name: "Petra Svobodová", avatarColor: "hsl(280, 60%, 50%)", initials: "PS" },
  { id: "m3", name: "Martin Dvořák", avatarColor: "hsl(152, 60%, 40%)", initials: "MD" },
  { id: "m4", name: "Eva Černá", avatarColor: "hsl(36, 95%, 50%)", initials: "EČ" },
  { id: "m5", name: "Tomáš Procházka", avatarColor: "hsl(340, 70%, 50%)", initials: "TP" },
];

const DEFAULT_SEGMENTS: CategoryDef[] = [
  { id: "seg1", label: "Retail" },
  { id: "seg2", label: "Corporate" },
  { id: "seg3", label: "Digital" },
];

const DEFAULT_DELIVERY_TYPES: CategoryDef[] = [
  { id: "dt1", label: "Vývoj" },
  { id: "dt2", label: "Analýza" },
  { id: "dt3", label: "Design" },
  { id: "dt4", label: "Testování" },
];

// ==========================================
// In-memory cache
// ==========================================
let cacheQuarters: QuarterDef[] = [];
let cacheMembers: TeamMember[] = [];
let cacheSegments: CategoryDef[] = [];
let cacheDeliveryTypes: CategoryDef[] = [];
let cacheTasks: Task[] = [];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function subscribeToStorage(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

// ==========================================
// Mapování DB ↔ App (snake_case ↔ camelCase)
// ==========================================
type DbTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  quarter_id: string | null;
  owner_id: string | null;
  participant_ids: string[];
  due_date: string | null;
  start_date: string | null;
  delay_reason: string | null;
  new_quarter_id: string | null;
  segment_ids: string[];
  delivery_type_id: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
};

function dbToTask(r: DbTask): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    status: r.status as Task["status"],
    quarterId: r.quarter_id ?? "",
    ownerId: r.owner_id ?? "",
    participantIds: r.participant_ids ?? [],
    dueDate: r.due_date ?? "",
    startDate: r.start_date ?? undefined,
    delayReason: r.delay_reason ?? undefined,
    newQuarterId: r.new_quarter_id ?? undefined,
    segmentIds: r.segment_ids ?? [],
    deliveryTypeId: r.delivery_type_id ?? undefined,
    imageUrls: r.image_urls ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function taskToDb(t: Partial<Task>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (t.id !== undefined) out.id = t.id;
  if (t.title !== undefined) out.title = t.title;
  if (t.description !== undefined) out.description = t.description;
  if (t.status !== undefined) out.status = t.status;
  if (t.quarterId !== undefined) out.quarter_id = t.quarterId || null;
  if (t.ownerId !== undefined) out.owner_id = t.ownerId || null;
  if (t.participantIds !== undefined) out.participant_ids = t.participantIds;
  if (t.dueDate !== undefined) out.due_date = t.dueDate || null;
  if (t.startDate !== undefined) out.start_date = t.startDate || null;
  if (t.delayReason !== undefined) out.delay_reason = t.delayReason || null;
  if (t.newQuarterId !== undefined) out.new_quarter_id = t.newQuarterId || null;
  if (t.segmentIds !== undefined) out.segment_ids = t.segmentIds;
  if (t.deliveryTypeId !== undefined) out.delivery_type_id = t.deliveryTypeId || null;
  if (t.imageUrls !== undefined) out.image_urls = t.imageUrls;
  return out;
}

function dbMember(r: { id: string; name: string; initials: string; avatar_color: string }): TeamMember {
  return { id: r.id, name: r.name, initials: r.initials, avatarColor: r.avatar_color };
}

// ==========================================
// Inicializace – načtení dat + jednorázová migrace z localStorage
// ==========================================
let initPromise: Promise<void> | null = null;

export function initStorage(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Načíst paralelně všechny tabulky
    const [qRes, mRes, sRes, dRes, tRes] = await Promise.all([
      supabase.from("quarters").select("*"),
      supabase.from("members").select("*"),
      supabase.from("segments").select("*"),
      supabase.from("delivery_types").select("*"),
      supabase.from("tasks").select("*"),
    ]);

    cacheQuarters = (qRes.data ?? []).map((r) => ({ id: r.id, label: r.label }));
    cacheMembers = (mRes.data ?? []).map(dbMember);
    cacheSegments = (sRes.data ?? []).map((r) => ({ id: r.id, label: r.label }));
    cacheDeliveryTypes = (dRes.data ?? []).map((r) => ({ id: r.id, label: r.label }));
    cacheTasks = (tRes.data ?? []).map((r) => dbToTask(r as DbTask));

    // Jednorázová migrace z localStorage, pokud je DB úplně prázdná
    const dbEmpty =
      cacheQuarters.length === 0 &&
      cacheMembers.length === 0 &&
      cacheSegments.length === 0 &&
      cacheDeliveryTypes.length === 0 &&
      cacheTasks.length === 0;

    if (dbEmpty) {
      await importFromLocalStorage();
    }

    // Realtime subscription
    setupRealtime();

    notify();
  })();
  return initPromise;
}

async function importFromLocalStorage() {
  const lsQuarters = readLS<QuarterDef[]>("taskboard_quarters") ?? DEFAULT_QUARTERS;
  const lsMembers = readLS<TeamMember[]>("taskboard_members") ?? DEFAULT_MEMBERS;
  const lsSegments = readLS<CategoryDef[]>("taskboard_segments") ?? DEFAULT_SEGMENTS;
  const lsDelivery = readLS<CategoryDef[]>("taskboard_delivery_types") ?? DEFAULT_DELIVERY_TYPES;
  const lsTasksRaw = readLS<Task[]>("taskboard_tasks") ?? [];

  // Migrace imageUrl → imageUrls a segmentId → segmentIds
  const lsTasks: Task[] = lsTasksRaw.map((t) => ({
    ...t,
    imageUrls: t.imageUrls && t.imageUrls.length > 0 ? t.imageUrls : t.imageUrl ? [t.imageUrl] : [],
    segmentIds: t.segmentIds && t.segmentIds.length > 0 ? t.segmentIds : t.segmentId ? [t.segmentId] : [],
  }));

  await Promise.all([
    lsQuarters.length > 0
      ? supabase.from("quarters").insert(lsQuarters.map((q) => ({ id: q.id, label: q.label })))
      : Promise.resolve(),
    lsMembers.length > 0
      ? supabase.from("members").insert(
          lsMembers.map((m) => ({ id: m.id, name: m.name, initials: m.initials, avatar_color: m.avatarColor }))
        )
      : Promise.resolve(),
    lsSegments.length > 0
      ? supabase.from("segments").insert(lsSegments.map((s) => ({ id: s.id, label: s.label })))
      : Promise.resolve(),
    lsDelivery.length > 0
      ? supabase.from("delivery_types").insert(lsDelivery.map((d) => ({ id: d.id, label: d.label })))
      : Promise.resolve(),
    lsTasks.length > 0
      ? supabase.from("tasks").insert(lsTasks.map((t) => taskToDb(t) as never))
      : Promise.resolve(),
  ]);

  cacheQuarters = lsQuarters;
  cacheMembers = lsMembers;
  cacheSegments = lsSegments;
  cacheDeliveryTypes = lsDelivery;
  cacheTasks = lsTasks;
}

function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// ==========================================
// Realtime
// ==========================================
function setupRealtime() {
  supabase
    .channel("storage-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "quarters" }, async () => {
      const { data } = await supabase.from("quarters").select("*");
      cacheQuarters = (data ?? []).map((r) => ({ id: r.id, label: r.label }));
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, async () => {
      const { data } = await supabase.from("members").select("*");
      cacheMembers = (data ?? []).map(dbMember);
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "segments" }, async () => {
      const { data } = await supabase.from("segments").select("*");
      cacheSegments = (data ?? []).map((r) => ({ id: r.id, label: r.label }));
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "delivery_types" }, async () => {
      const { data } = await supabase.from("delivery_types").select("*");
      cacheDeliveryTypes = (data ?? []).map((r) => ({ id: r.id, label: r.label }));
      notify();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, async () => {
      const { data } = await supabase.from("tasks").select("*");
      cacheTasks = (data ?? []).map((r) => dbToTask(r as DbTask));
      notify();
    })
    .subscribe();
}

// ==========================================
// Kvartály
// ==========================================
export function getQuarters(): QuarterDef[] { return cacheQuarters; }
export function addQuarter(label: string): QuarterDef {
  const item: QuarterDef = { id: genId("q"), label };
  cacheQuarters = [...cacheQuarters, item];
  notify();
  supabase.from("quarters").insert({ id: item.id, label: item.label }).then();
  return item;
}
export function updateQuarter(id: string, label: string): QuarterDef | null {
  const idx = cacheQuarters.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  cacheQuarters = cacheQuarters.map((q) => (q.id === id ? { ...q, label } : q));
  notify();
  supabase.from("quarters").update({ label }).eq("id", id).then();
  return cacheQuarters[idx];
}
export function deleteQuarter(id: string): boolean {
  const before = cacheQuarters.length;
  cacheQuarters = cacheQuarters.filter((q) => q.id !== id);
  if (cacheQuarters.length === before) return false;
  notify();
  supabase.from("quarters").delete().eq("id", id).then();
  return true;
}

// ==========================================
// Členové
// ==========================================
export function getMembers(): TeamMember[] { return cacheMembers; }
export function getMemberById(id: string): TeamMember | undefined { return cacheMembers.find((m) => m.id === id); }
export function addMember(data: Omit<TeamMember, "id">): TeamMember {
  const item: TeamMember = { ...data, id: genId("m") };
  cacheMembers = [...cacheMembers, item];
  notify();
  supabase.from("members").insert({ id: item.id, name: item.name, initials: item.initials, avatar_color: item.avatarColor }).then();
  return item;
}
export function updateMember(id: string, data: Partial<Omit<TeamMember, "id">>): TeamMember | null {
  const idx = cacheMembers.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated = { ...cacheMembers[idx], ...data };
  cacheMembers = cacheMembers.map((m) => (m.id === id ? updated : m));
  notify();
  const dbPatch: Record<string, unknown> = {};
  if (data.name !== undefined) dbPatch.name = data.name;
  if (data.initials !== undefined) dbPatch.initials = data.initials;
  if (data.avatarColor !== undefined) dbPatch.avatar_color = data.avatarColor;
  supabase.from("members").update(dbPatch).eq("id", id).then();
  return updated;
}
export function deleteMember(id: string): boolean {
  const before = cacheMembers.length;
  cacheMembers = cacheMembers.filter((m) => m.id !== id);
  if (cacheMembers.length === before) return false;
  notify();
  supabase.from("members").delete().eq("id", id).then();
  return true;
}

// ==========================================
// Segmenty
// ==========================================
export function getSegments(): CategoryDef[] { return cacheSegments; }
export function addSegment(label: string): CategoryDef {
  const item: CategoryDef = { id: genId("seg"), label };
  cacheSegments = [...cacheSegments, item];
  notify();
  supabase.from("segments").insert({ id: item.id, label: item.label }).then();
  return item;
}
export function updateSegment(id: string, label: string): CategoryDef | null {
  const idx = cacheSegments.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  cacheSegments = cacheSegments.map((s) => (s.id === id ? { ...s, label } : s));
  notify();
  supabase.from("segments").update({ label }).eq("id", id).then();
  return cacheSegments[idx];
}
export function deleteSegment(id: string): boolean {
  const before = cacheSegments.length;
  cacheSegments = cacheSegments.filter((s) => s.id !== id);
  if (cacheSegments.length === before) return false;
  notify();
  supabase.from("segments").delete().eq("id", id).then();
  return true;
}

// ==========================================
// Druhy dodávky
// ==========================================
export function getDeliveryTypes(): CategoryDef[] { return cacheDeliveryTypes; }
export function addDeliveryType(label: string): CategoryDef {
  const item: CategoryDef = { id: genId("dt"), label };
  cacheDeliveryTypes = [...cacheDeliveryTypes, item];
  notify();
  supabase.from("delivery_types").insert({ id: item.id, label: item.label }).then();
  return item;
}
export function updateDeliveryType(id: string, label: string): CategoryDef | null {
  const idx = cacheDeliveryTypes.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  cacheDeliveryTypes = cacheDeliveryTypes.map((d) => (d.id === id ? { ...d, label } : d));
  notify();
  supabase.from("delivery_types").update({ label }).eq("id", id).then();
  return cacheDeliveryTypes[idx];
}
export function deleteDeliveryType(id: string): boolean {
  const before = cacheDeliveryTypes.length;
  cacheDeliveryTypes = cacheDeliveryTypes.filter((d) => d.id !== id);
  if (cacheDeliveryTypes.length === before) return false;
  notify();
  supabase.from("delivery_types").delete().eq("id", id).then();
  return true;
}

// ==========================================
// Úkoly
// ==========================================
export function getTasks(): Task[] { return cacheTasks; }

export function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const now = new Date().toISOString();
  const newTask: Task = { ...task, id: genId("t"), createdAt: now, updatedAt: now };
  cacheTasks = [...cacheTasks, newTask];
  notify();
  supabase.from("tasks").insert(taskToDb(newTask) as never).then();
  return newTask;
}

export function updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
  const idx = cacheTasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const updated: Task = { ...cacheTasks[idx], ...updates, updatedAt: new Date().toISOString() };
  cacheTasks = cacheTasks.map((t) => (t.id === id ? updated : t));
  notify();
  supabase.from("tasks").update(taskToDb(updates) as never).eq("id", id).then();
  return updated;
}

export function deleteTask(id: string): boolean {
  const before = cacheTasks.length;
  cacheTasks = cacheTasks.filter((t) => t.id !== id);
  if (cacheTasks.length === before) return false;
  notify();
  supabase.from("tasks").delete().eq("id", id).then();
  return true;
}
