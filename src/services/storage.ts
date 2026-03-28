/**
 * Služba pro práci s localStorage
 * 
 * V Fázi 2 se tyto funkce nahradí voláním Firebase Firestore.
 * API je navržené tak, aby přechod byl co nejjednodušší.
 */

import { Task, TeamMember } from "@/types/task";

const TASKS_KEY = "taskboard_tasks";
const MEMBERS_KEY = "taskboard_members";

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
    quarter: "Q1",
    ownerId: "m1",
    participantIds: ["m2", "m4"],
    dueDate: "2026-03-15",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t2",
    title: "Implementace notifikačního systému",
    description: "Push a in-app notifikace pro klíčové události (platby, upozornění, zprávy).",
    status: "in-progress",
    quarter: "Q1",
    ownerId: "m2",
    participantIds: ["m1", "m3"],
    dueDate: "2026-03-31",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t3",
    title: "API pro export dat",
    description: "REST endpoint pro export transakčních dat do CSV a PDF formátů.",
    status: "todo",
    quarter: "Q2",
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
    quarter: "Q2",
    ownerId: "m4",
    participantIds: ["m1", "m3"],
    dueDate: "2026-05-30",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "t5",
    title: "Mobilní verze portfolia",
    description: "Responzivní design pro sekci investičního portfolia na mobilních zařízeních.",
    status: "todo",
    quarter: "Q2",
    ownerId: "m5",
    participantIds: ["m2", "m4"],
    dueDate: "2026-06-30",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ==========================================
// Členové týmu
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

/** Najde člena podle ID */
export function getMemberById(id: string): TeamMember | undefined {
  return getMembers().find((m) => m.id === id);
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
