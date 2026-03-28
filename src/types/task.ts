/**
 * Datové typy pro správu úkolů
 * Struktura připravená na budoucí migraci na Firebase Firestore
 */

/** Stavy úkolu */
export type TaskStatus = "todo" | "in-progress" | "done";

/** Kvartály roku */
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/** Člen týmu */
export interface TeamMember {
  id: string;
  name: string;
  /** Barva avataru (HSL nebo hex) – používá se když není foto */
  avatarColor: string;
  /** Iniciály pro avatar bez fotky */
  initials: string;
}

/** Úkol */
export interface Task {
  id: string;
  /** Název úkolu */
  title: string;
  /** Detailní popis */
  description: string;
  /** Aktuální stav */
  status: TaskStatus;
  /** Kvartál, do kterého úkol patří */
  quarter: Quarter;
  /** ID hlavní zodpovědné osoby */
  ownerId: string;
  /** ID osob, které na úkolu participují */
  participantIds: string[];
  /** Termín dokončení (ISO string) */
  dueDate: string;
  /** Nahraný obrázek jako Base64 data URL (pro Fázi 1) */
  imageUrl?: string;
  /** Datum vytvoření (ISO string) */
  createdAt: string;
  /** Datum poslední úpravy (ISO string) */
  updatedAt: string;
}

/** Překlad stavů do češtiny */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  "todo": "K řešení",
  "in-progress": "Probíhá",
  "done": "Hotovo",
};

/** Překlad kvartálů */
export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: "1. kvartál",
  Q2: "2. kvartál",
  Q3: "3. kvartál",
  Q4: "4. kvartál",
};
