/**
 * Služba pro práci s localStorage
 * 
 * V Fázi 2 se tyto funkce nahradí voláním Firebase Firestore.
 * API je navržené tak, aby přechod byl co nejjednodušší.
 */

import { Task, TeamMember, QuarterDef } from "@/types/task";

const TASKS_KEY = "taskboard_tasks";
const MEMBERS_KEY = "taskboard_members";
const QUARTERS_KEY = "taskboard_quarters";

// ==========================================
// Výchozí kvartály (demo data)
// ==========================================
const DEFAULT_QUARTERS: QuarterDef[] = [
  { id: "q1-2026", label: "Q1/2026" },
  { id: "q2-2026", label: "Q2/2026" },
  { id: "q3-2026", label: "Q3/2026" },
  { id: "q4-2026", label: "Q4/2026" },
];

// ==========================================
// Výchozí členové týmu (demo data)
// ==========================================
const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "m1", name: "Jan Novák", avatarColor: "hsl(214, 80%, 40%)", initials: "JN" },
  { id: "m2", name: "Petra Svobodová", avatarColor: "hsl(280, 60%, 50%)", initials: "PS" },
  { id: "m3", name: "Martin Dvořák", avatarColor: "hsl(152, 60%, 40%)", initials: "MD" },
  { id: "m4", name: "Eva Černá", avatarColor: "hsl(36, 95%, 50%)", initials: "EČ" },
  { id: "m5", name: "Tomáš Procházka", avatarColor: "hsl(340, 70%, 50%)", initials: "TP" },
];

// ==========================================
// Výchozí úkoly (demo data)
// ==========================================
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t2",
    title: "Implementace notifikačního systému",
    description: "Push a in-app notifikace pro klíčové události (platby, upozornění, zprávy).",
    status: "in-progress",
    quarterId: "q1-2026",
    ownerId: "m2",
    participantIds: ["m1", "m3"],
    dueDate: "2026-03-31",
    startDate: "2026-02-15",
    delayReason: "Čekáme na API třetí strany pro push notifikace.",
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t4",
    title: "Optimalizace výkonu dashboardu",
    description: "Lazy loading, virtualizace seznamů a caching pro rychlejší načítání.",
    status: "in-progress",
    quarterId: "q2-2026",
    ownerId: "m4",
    participantIds: ["m1", "m3"],
    dueDate: "2026-05-30",
    startDate: "2026-04-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t5",
    title: "Mobilní verze portfolia",
    description: "Responzivní design pro sekci investičního portfolia na mobilních zařízeních.",
    status: "todo",
    quarterId: "q2-2026",
    ownerId: "m5",
    participantIds: ["m2", "m4"],
    dueDate: "2026-06-30",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ==========================================
// Kvartály – CRUD
// ==========================================

/** Načte všechny kvartály */
export function getQuarters(): QuarterDef[] {
  const data = localStorage.getItem(QUARTERS_KEY);
  if (!data) {
    localStorage.setItem(QUARTERS_KEY, JSON.stringify(DEFAULT_QUARTERS));
    return DEFAULT_QUARTERS;
  }
  return JSON.parse(data);
}

function saveQuarters(quarters: QuarterDef[]): void {
  localStorage.setItem(QUARTERS_KEY, JSON.stringify(quarters));
}

/** Přidá nový kvartál */
export function addQuarter(label: string): QuarterDef {
  const quarters = getQuarters();
  const newQ: QuarterDef = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    label,
  };
  quarters.push(newQ);
  saveQuarters(quarters);
  return newQ;
}

/** Smaže kvartál */
export function deleteQuarter(id: string): boolean {
  const quarters = getQuarters();
  const filtered = quarters.filter((q) => q.id !== id);
  if (filtered.length === quarters.length) return false;
  saveQuarters(filtered);
  return true;
}

/** Aktualizuje kvartál */
export function updateQuarter(id: string, label: string): QuarterDef | null {
  const quarters = getQuarters();
  const idx = quarters.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  quarters[idx] = { ...quarters[idx], label };
  saveQuarters(quarters);
  return quarters[idx];
}

// ==========================================
// Členové týmu – CRUD
// ==========================================

/** Načte všechny členy týmu */
export function getMembers(): TeamMember[] {
  const data = localStorage.getItem(MEMBERS_KEY);
  if (!data) {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(DEFAULT_MEMBERS));
    return DEFAULT_MEMBERS;
  }
  return JSON.parse(data);
}

function saveMembers(members: TeamMember[]): void {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

/** Najde člena podle ID */
export function getMemberById(id: string): TeamMember | undefined {
  return getMembers().find((m) => m.id === id);
}

/** Přidá nového člena */
export function addMember(data: Omit<TeamMember, "id">): TeamMember {
  const members = getMembers();
  const newMember: TeamMember = {
    ...data,
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
  };
  members.push(newMember);
  saveMembers(members);
  return newMember;
}

/** Aktualizuje člena */
export function updateMember(id: string, data: Partial<Omit<TeamMember, "id">>): TeamMember | null {
  const members = getMembers();
  const idx = members.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  members[idx] = { ...members[idx], ...data };
  saveMembers(members);
  return members[idx];
}

/** Smaže člena */
export function deleteMember(id: string): boolean {
  const members = getMembers();
  const filtered = members.filter((m) => m.id !== id);
  if (filtered.length === members.length) return false;
  saveMembers(filtered);
  return true;
}

// ==========================================
// Úkoly – CRUD operace
// ==========================================

/** Načte všechny úkoly */
export function getTasks(): Task[] {
  const data = localStorage.getItem(TASKS_KEY);
  if (!data) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS;
  }
  return JSON.parse(data);
}

/** Uloží pole úkolů do localStorage */
function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

/** Vytvoří nový úkol */
export function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const tasks = getTasks();
  const newTask: Task = {
    ...task,
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  saveTasks(tasks);
  return newTask;
}

/** Aktualizuje existující úkol */
export function updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
  const tasks = getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tasks[index] = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveTasks(tasks);
  return tasks[index];
}

/** Smaže úkol */
export function deleteTask(id: string): boolean {
  const tasks = getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  if (filtered.length === tasks.length) return false;
  saveTasks(filtered);
  return true;
}
