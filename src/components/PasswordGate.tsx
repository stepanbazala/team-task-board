import { FormEvent, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PASSWORD = "LukasKrch@jehoTym1";
const STORAGE_KEY = "app_auth_v1";

export const PasswordGate = ({ children }: { children: React.ReactNode }) => {
  const [authed, setAuthed] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(STORAGE_KEY) === "1");
    setReady(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!ready) return null;
  if (authed) return <>{children}</>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card border rounded-2xl shadow-sm p-8 space-y-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Přístup chráněn heslem</h1>
          <p className="text-sm text-muted-foreground">
            Zadej heslo pro vstup do aplikace.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Heslo</Label>
          <Input
            id="password"
            type="password"
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            className={error ? "border-destructive" : ""}
          />
          {error && (
            <p className="text-sm text-destructive">Nesprávné heslo.</p>
          )}
        </div>

        <Button type="submit" className="w-full">
          Vstoupit
        </Button>
      </form>
    </main>
  );
};
