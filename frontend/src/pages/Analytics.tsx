import { ErrorBox, PageHeader, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { Analytics as A } from "../lib/types";
import { cx, regionLabel, useLoad } from "../lib/utils";

function Bars({ rows, color = "bg-signal" }: { rows: { label: string; value: number; tone?: string }[]; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-ink-700">{r.label}</span>
          <div className="h-5 flex-1 rounded bg-paper"><div className={cx("h-5 rounded", r.tone ?? color)} style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value ? 6 : 0 }} /></div>
          <span className="w-8 text-right font-semibold">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { data: a, loading, error } = useLoad(() => api.get<A>("/analytics/summary"));
  if (loading) return <Spinner />;
  if (!a) return <ErrorBox message={error || "No data"} />;
  const k = a.kpis;
  return (
    <>
      <PageHeader title="Analytics" subtitle="Where your search stands, which skills the market asks for, and which gaps matter most." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Jobs scored", k.jobs], ["Average match", `${k.avg_match}%`], ["Strong matches", k.high_matches], ["Applications", k.applications], ["Awaiting approval", k.pending_approvals], ["Emails sent", k.emails_sent], ["Interview rate", `${k.response_rate}%`], ["Agent runs", k.agent_runs]].map(([l, v]) => (
          <div key={String(l)} className="card p-4"><div className="text-2xl font-bold">{v}</div><div className="mt-1 text-sm text-ink-400">{l}</div></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><h2 className="mb-4 font-semibold">Application funnel</h2><Bars rows={a.funnel.map((f) => ({ label: f.stage, value: f.count }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Match score distribution</h2><Bars color="bg-go" rows={Object.entries(a.score_distribution).map(([label, value]) => ({ label, value }))} /></section>
        <section className="card p-5"><h2 className="mb-4 font-semibold">Jobs by region</h2><Bars rows={Object.entries(a.by_region).map(([label, value]) => ({ label: regionLabel[label] ?? label, value }))} /></section>
        <section className="card p-5"><h2 className="mb-1 font-semibold">Skill gaps</h2><p className="mb-4 text-xs text-ink-400">Skills that appear in jobs you matched but are missing from your profile</p>
          {a.skill_gaps.length ? <Bars color="bg-clear" rows={a.skill_gaps.map((s) => ({ label: s.skill, value: s.count }))} /> : <p className="text-sm text-ink-400">Run a job search to see gaps.</p>}</section>
        <section className="card p-5 lg:col-span-2"><h2 className="mb-1 font-semibold">Most requested skills</h2><p className="mb-4 text-xs text-ink-400">Green bars are skills you already list</p>
          {a.skill_demand.length ? <Bars rows={a.skill_demand.map((s) => ({ label: s.skill, value: s.count, tone: s.have ? "bg-go" : "bg-ink-300" }))} /> : <p className="text-sm text-ink-400">No job data yet.</p>}</section>
      </div>
    </>
  );
}
