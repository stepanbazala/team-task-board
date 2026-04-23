import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PasswordGate } from "./components/PasswordGate";
import { initStorage } from "@/services/storage";
import { useStorageSync } from "@/hooks/use-storage-sync";
import AdminBoard from "./pages/AdminBoard";
import Dashboard from "./pages/Dashboard";
import BoardView from "./pages/BoardView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const [ready, setReady] = useState(false);
  // přihlásit se k aktualizacím sdílených dat (realtime + lokální mutace)
  useStorageSync();

  useEffect(() => {
    initStorage()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Nepodařilo se načíst data:", err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Načítám data…
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<AdminBoard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/board" element={<BoardView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PasswordGate>
        <AppContent />
      </PasswordGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
