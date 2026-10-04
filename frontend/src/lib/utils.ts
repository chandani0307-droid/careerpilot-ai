import { useCallback, useEffect, useState } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function scoreTone(score: number) {
  return score >= 75 ? { text: "text-go", bg: "bg-go-50", stroke: "#178F63", label: "Strong match" }
    : score >= 55 ? { text: "text-signal", bg: "bg-signal-50", stroke: "#2D6BFF", label: "Good match" }
    : score >= 35 ? { text: "text-clear-700", bg: "bg-clear-50", stroke: "#E9A23B", label: "Partial match" }
    : { text: "text-ink-400", bg: "bg-paper", stroke: "#A9B5C8", label: "Low match" };
}
export const regionLabel: Record<string, string> = { india: "India", abroad: "Abroad", remote: "Remote", all: "All regions" };
export const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");

/** Minimal data hook: loads on mount, exposes reload + error. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fn()); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { void load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}
