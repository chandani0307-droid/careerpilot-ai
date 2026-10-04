import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { ActionItem, Health, ProfileOut } from "../lib/types";

interface Toast { id: number; text: string; kind: "ok" | "err" }
interface Ctx {
  profile: ProfileOut | null; setProfile: (p: ProfileOut | null) => void; health: Health | null; offline: boolean;
  pending: number; refreshPending: () => Promise<void>; toast: (text: string, kind?: "ok" | "err") => void; ready: boolean;
}
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileOut | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  const refreshPending = useCallback(async () => {
    try { setPending((await api.get<ActionItem[]>("/actions?status=pending")).length); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setHealth(await api.get<Health>("/health"));
        setProfile(await api.get<ProfileOut | null>("/profile"));
        await refreshPending();
      } catch { setOffline(true); } finally { setReady(true); }
    })();
  }, [refreshPending]);

  const value = useMemo(() => ({ profile, setProfile, health, offline, pending, refreshPending, toast, ready }), [profile, health, offline, pending, refreshPending, toast, ready]);
  return (
    <AppCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-sm rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${t.kind === "ok" ? "bg-ink" : "bg-alert"}`}>{t.text}</div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
