/**
 * Hook, který přinutí komponentu rerender pokaždé, když se změní sdílená data
 * v `services/storage` (lokální mutace nebo realtime z Supabase).
 */
import { useEffect, useState } from "react";
import { subscribeToStorage } from "@/services/storage";

export function useStorageSync(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToStorage(() => setTick((n) => n + 1));
    return () => { unsub(); };
  }, []);
  return tick;
}
