/**
 * Datové typy pro správu úkolů
 * Struktura připravená na budoucí migraci na Firebase Firestore
 */

/** Stavy úkolu */
export type TaskStatus = "todo" | "in-progress" | "done";

/** Dynamický kvartál (např. "Q1/2026") */
export interface QuarterDef {
  id: string;
  label: string;
}

/** Kategorie (segment, druh dodávky apod.) */
export interface CategoryDef {
  id: string;
  label: string;
}

/** Člen týmu */
export interface TeamMember {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
}

/** Úkol */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  quarterId: string;
  ownerId: string;
  participantIds: string[];
  dueDate: string;
  startDate?: string;
  delayReason?: string;
  newQuarterId?: string;
  /** Segmenty (kategorie 1) – multi-select */
  segmentIds?: string[];
  /** @deprecated Použij segmentIds */
  segmentId?: string;
  /** Druh dodávky (kategorie 2) */
  deliveryTypeId?: string;
  /** Nahrané obrázky jako Base64 data URLs (max 6) */
  imageUrls?: string[];
  /** @deprecated Použij imageUrls */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Překlad stavů do češtiny */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  "todo": "K řešení",
  "in-progress": "Probíhá",
  "done": "Hotovo",
};

/** Vrátí pole segment ID s ohledem na zpětnou kompatibilitu (segmentId -> segmentIds) */
export function getTaskSegmentIds(task: Pick<Task, "segmentIds" | "segmentId">): string[] {
  if (task.segmentIds && task.segmentIds.length > 0) return task.segmentIds;
  if (task.segmentId) return [task.segmentId];
  return [];
}
