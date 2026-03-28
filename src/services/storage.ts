/**
 * Služba pro práci s localStorage
 * V Fázi 2 se tyto funkce nahradí voláním Firebase Firestore.
 */

import { Task, TeamMember, QuarterDef, CategoryDef } from "@/types/task";

const TASKS_KEY = "taskboard_tasks";
const MEMBERS_KEY = "taskboard_members";
const QUARTERS_KEY = "taskboard_quarters";
const SEGMENTS_KEY = "taskboard_segments";
const DELIVERY_TYPES_KEY = "taskboard_delivery_types";

// ==========================================
// Výchozí data
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

const DEFAULT_TASKS: Task[] = [
  {
    id: "t1",
    title: "Redesign přihlašovací stránky",
    description: "Kompletní přepracování UI/UX přihlašovacího formuláře dle nového brandu.",
    status: "done",
    quarterId: "q1-2026",
    ownerId: "m1",
    participantIds: ["m2", "m4"],
    dueDate: "2026-03-15",
    startDate: "2026-01-10",
    segmentId: "seg3",
    deliveryTypeId: "dt1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t2",
    title: "Implementace notifikačního systému",
    description: "Push a in-app notifikace pro klíčové události.",
    status: "in-progress",
    quarterId: "q1-2026",
    ownerId: "m2",
    participantIds: ["m1", "m3"],
    dueDate: "2026-03-31",
    startDate: "2026-02-15",
    delayReason: "Čekáme na API třetí strany pro push notifikace.",
    newQuarterId: "q2-2026",
    segmentId: "seg1",
    deliveryTypeId: "dt1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t3",
    title: "API pro export dat",
    description: "REST endpoint pro export transakčních dat do CSV a PDF formátů.",
    status: "todo",
    quarterId: "q2-2026",
    ownerId: "m3",
    participantIds: ["m5"],
    dueDate: "2026-06-15",
    segmentId: "seg2",
    deliveryTypeId: "dt2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t4",
    title: "Optimalizace výkonu dashboardu",
    description: "Lazy loading, virtualizace seznamů a caching.",
    status: "in-progress",
    quarterId: "q2-2026",
    ownerId: "m4",
    participantIds: ["m1", "m3"],
    dueDate: "2026-05-30",
    startDate: "2026-04-01",
    segmentId: "seg3",
    deliveryTypeId: "dt1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t5",
    title: "Mobilní verze portfolia",
    description: "Responzivní design pro sekci investičního portfolia.",
    status: "todo",
    quarterId: "q2-2026",
    ownerId: "m5",
    participantIds: ["m2", "m4"],
    dueDate: "2026-06-30",
    segmentId: "seg1",
    deliveryTypeId: "dt3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ==========================================
// Generic helpers
// ==========================================
function getList<T>(key: string, defaults: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data);
}

function saveList<T>(key: string, list: T[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

// ==========================================
// Kvartály
// ==========================================
export function getQuarters(): QuarterDef[] { return getList(QUARTERS_KEY, DEFAULT_QUARTERS); }
export function addQuarter(label: string): QuarterDef {
  const list = getQuarters();
  const item: QuarterDef = { id: genId("q"), label };
  list.push(item);
  saveList(QUARTERS_KEY, list);
  return item;
}
export function deleteQuarter(id: string): boolean {
  const list = getQuarters();
  const f = list.filter((q) => q.id !== id);
  if (f.length === list.length) return false;
  saveList(QUARTERS_KEY, f);
  return true;
}
export function updateQuarter(id: string, label: string): QuarterDef | null {
  const list = getQuarters();
  const idx = list.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], label };
  saveList(QUARTERS_KEY, list);
  return list[idx];
}

// ==========================================
// Členové
// ==========================================
export function getMembers(): TeamMember[] { return getList(MEMBERS_KEY, DEFAULT_MEMBERS); }
export function getMemberById(id: string): TeamMember | undefined { return getMembers().find((m) => m.id === id); }
export function addMember(data: Omit<TeamMember, "id">): TeamMember {
  const list = getMembers();
  const item: TeamMember = { ...data, id: genId("m") };
  list.push(item);
  saveList(MEMBERS_KEY, list);
  return item;
}
export function updateMember(id: string, data: Partial<Omit<TeamMember, "id">>): TeamMember | null {
  const list = getMembers();
  const idx = list.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data };
  saveList(MEMBERS_KEY, list);
  return list[idx];
}
export function deleteMember(id: string): boolean {
  const list = getMembers();
  const f = list.filter((m) => m.id !== id);
  if (f.length === list.length) return false;
  saveList(MEMBERS_KEY, f);
  return true;
}

// ==========================================
// Segmenty
// ==========================================
export function getSegments(): CategoryDef[] { return getList(SEGMENTS_KEY, DEFAULT_SEGMENTS); }
export function addSegment(label: string): CategoryDef {
  const list = getSegments();
  const item: CategoryDef = { id: genId("seg"), label };
  list.push(item);
  saveList(SEGMENTS_KEY, list);
  return item;
}
export function updateSegment(id: string, label: string): CategoryDef | null {
  const list = getSegments();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], label };
  saveList(SEGMENTS_KEY, list);
  return list[idx];
}
export function deleteSegment(id: string): boolean {
  const list = getSegments();
  const f = list.filter((s) => s.id !== id);
  if (f.length === list.length) return false;
  saveList(SEGMENTS_KEY, f);
  return true;
}

// ==========================================
// Druhy dodávky
// ==========================================
export function getDeliveryTypes(): CategoryDef[] { return getList(DELIVERY_TYPES_KEY, DEFAULT_DELIVERY_TYPES); }
export function addDeliveryType(label: string): CategoryDef {
  const list = getDeliveryTypes();
  const item: CategoryDef = { id: genId("dt"), label };
  list.push(item);
  saveList(DELIVERY_TYPES_KEY, list);
  return item;
}
export function updateDeliveryType(id: string, label: string): CategoryDef | null {
  const list = getDeliveryTypes();
  const idx = list.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], label };
  saveList(DELIVERY_TYPES_KEY, list);
  return list[idx];
}
export function deleteDeliveryType(id: string): boolean {
  const list = getDeliveryTypes();
  const f = list.filter((d) => d.id !== id);
  if (f.length === list.length) return false;
  saveList(DELIVERY_TYPES_KEY, f);
  return true;
}

// ==========================================
// Úkoly
// ==========================================
export function getTasks(): Task[] {
  const data = localStorage.getItem(TASKS_KEY);
  if (!data) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS;
  }
  // Migrace: imageUrl → imageUrls
  const tasks: Task[] = JSON.parse(data);
  let migrated = false;
  tasks.forEach((t) => {
    if (t.imageUrl && (!t.imageUrls || t.imageUrls.length === 0)) {
      t.imageUrls = [t.imageUrl];
      delete t.imageUrl;
      migrated = true;
    }
  });
  if (migrated) saveTasks(tasks);
  return tasks;
}

function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: genId("t"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  saveTasks(tasks);
  return tasks[index];
}

export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
}
