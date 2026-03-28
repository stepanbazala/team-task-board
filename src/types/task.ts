/**
 * Datové typy pro správu úkolů
 * Struktura připravená na budoucí migraci na Firebase Firestore
 */

/** Stavy úkolu */
export type TaskStatus = "todo" | "in-progress" | "done";

/** Dynamický kvartál (např. "Q1/2026") */
export interface QuarterDef {
  id: string;
  label: string; // např. "Q1/2026"
}

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
  /** ID kvartálu, do kterého úkol patří */
  quarterId: string;
  /** ID hlavní zodpovědné osoby */
  ownerId: string;
  /** ID osob, které na úkolu participují */
  participantIds: string[];
  /** Termín dokončení (ISO string) */
  dueDate: string;
  /** Datum zahájení práce (ISO string) */
  startDate?: string;
  /** Důvod zpoždění (pokud se úkol zpožďuje) */
  delayReason?: string;
  /** Nově plánované dodání – ID kvartálu, pokud se úkol přesunul */
  newQuarterId?: string;
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
