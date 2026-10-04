import { BarChart3, Bot, Briefcase, Compass, FileText, GraduationCap, LayoutDashboard, ListChecks, Mail, Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { cx } from "../lib/utils";
import ChatWidget from "./ChatWidget";
import { useApp } from "./context";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/resume", label: "Resume", icon: FileText },
  { to: "/agent", label: "Agent", icon: Bot },
  { to: "/applications", label: "Applications", icon: ListChecks },
  { to: "/outreach", label: "Outreach", icon: Mail },
  { to: "/interview", label: "Interview", icon: GraduationCap },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { health, offline, pending, profile } = useApp();
  const mode = health?.llm_provider ?? "mock";

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Main">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => cx("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition", isActive ? "bg-ink-700 text-white" : "text-ink-300 hover:bg-ink-800 hover:text-white")}>
          <Icon className="h-4 w-4" /> {label}
          {label === "Agent" && pending > 0 && <span className="ml-auto rounded-full bg-clear px-1.5 text-xs font-bold text-ink">{pending}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col bg-ink py-5 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-6 text-white"><Compass className="h-6 w-6 text-signal" /><span className="text-lg font-bold tracking-tight">CareerPilot AI</span></Link>
        {nav}
        <div className="mx-3 mt-4 rounded-lg bg-ink-800 p-3 text-xs text-ink-300">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-white"><ShieldCheck className="h-3.5 w-3.5 text-clear" /> You stay in control</div>
          Nothing is applied, emailed or messaged until you approve it.
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink/50" />
          <aside className="relative flex h-full w-64 flex-col bg-ink py-5" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-3 top-3 text-ink-300" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            <div className="mb-6 flex items-center gap-2 px-6 text-white"><Compass className="h-6 w-6 text-signal" /><span className="text-lg font-bold">CareerPilot AI</span></div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur sm:px-8">
          <button className="rounded p-1.5 hover:bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1 truncate text-sm text-ink-400">{profile ? <>Signed in as <span className="font-semibold text-ink">{profile.data.name || "your profile"}</span></> : "No resume yet"}</div>
          <span className={cx("hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline", mode === "mock" ? "border-line bg-white text-ink-400" : "border-go/30 bg-go-50 text-go")} title={health?.llm_error || ""}>
            {mode === "mock" ? "Offline mode · templates" : `AI: ${mode}`}
          </span>
          {pending > 0 && (
            <Link to="/agent" className="flex items-center gap-1.5 rounded-full bg-clear-50 px-3 py-1 text-xs font-semibold text-clear-700 ring-1 ring-clear/40">
              <ShieldCheck className="h-3.5 w-3.5" /> {pending} awaiting approval
            </Link>
          )}
        </header>
        {offline && <div className="bg-alert px-4 py-2 text-center text-sm text-white">Can't reach the backend. Start it with <code className="font-mono">uvicorn app.main:app --reload</code> in /backend.</div>}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8"><Outlet /></main>
      </div>
      <ChatWidget />
    </div>
  );
}
