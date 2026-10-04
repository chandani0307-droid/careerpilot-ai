import { CheckCircle2, CircleDashed, Loader2, Play, ShieldCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ActionCard } from "../components/Approvals";
import { useApp } from "../components/context";
import { Empty, ErrorBox, Field, PageHeader, ScoreRing, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { ActionItem, AgentRun, Region } from "../lib/types";
import { cx, fmtDate, useLoad } from "../lib/utils";

const PIPELINE = ["Planner", "Job Scout", "Matcher", "Resume & Cover Letter Writer", "Outreach Agent", "Interview Coach", "Approval Gate"];

export default function Agent() {
  const { profile, toast, refreshPending } = useApp();
  const [form, setForm] = useState({ goal: "Find and prepare the best jobs for me", query: "", region: "all" as Region, location: "", top_k: 3 });
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [error, setError] = useState("");
  const queue = useLoad(() => api.get<ActionItem[]>("/actions?status=pending"));
  const history = useLoad(() => api.get<AgentRun[]>("/agent/runs"));
  const shown = run ?? history.data?.[0] ?? null;

  async function start() {
    setRunning(true); setError(""); setRun(null);
    try {
      const r = await api.post<AgentRun>("/agent/run", { ...form, min_score: 35 });
      setRun(r); await queue.reload(); await history.reload(); await refreshPending();
      toast(r.status === "blocked" ? "Upload a resume first" : "Agent finished. Review the drafts below.", r.status === "failed" ? "err" : "ok");
    } catch (e) { setError((e as Error).message); } finally { setRunning(false); }
  }
  const refresh = async () => { await queue.reload(); await refreshPending(); };

  return (
    <>
      <PageHeader title="Agent workspace" subtitle="Seven agents work as one LangGraph workflow. They can search and draft, but only you can approve anything that goes out." />
      <ErrorBox message={error} />
      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section className="card h-fit space-y-3 p-5">
          <h2 className="font-semibold">Mission</h2>
          <Field label="Goal"><input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
          <Field label="Search focus (optional)"><input value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })} placeholder="Defaults to your target roles" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Region"><select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Region })}><option value="all">All</option><option value="india">India</option><option value="abroad">Abroad</option><option value="remote">Remote</option></select></Field>
            <Field label="Prepare top"><select value={form.top_k} onChange={(e) => setForm({ ...form, top_k: +e.target.value })}>{[1, 2, 3, 5, 8].map((n) => <option key={n} value={n}>{n} jobs</option>)}</select></Field>
          </div>
          <Field label="City or country (optional)"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Bengaluru" /></Field>
          <button className="btn btn-primary w-full" disabled={running || !profile} onClick={start}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {running ? "Agents working…" : "Run agent"}</button>
          {!profile && <p className="text-sm text-alert">Upload your resume first. <Link className="underline" to="/resume">Go to Resume</Link></p>}
          <p className="flex gap-2 rounded-lg bg-clear-50 p-3 text-xs text-clear-700"><ShieldCheck className="h-4 w-4 shrink-0" /> The run creates drafts in the approval queue. No email, application or message is sent by the agents.</p>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Workflow</h2>
          {running ? (
            <div className="card p-5"><Spinner label="Planner → Scout → Matcher → Writer → Outreach → Coach. This can take up to a minute with a live AI model." /></div>
          ) : !shown ? (
            <Empty title="No runs yet" hint="Press Run agent to start your first workflow." />
          ) : (
            <div className="card divide-y divide-line">
              {PIPELINE.map((name) => {
                const step = shown.trace.find((t) => t.agent === name);
                const Icon = !step ? CircleDashed : step.status === "blocked" || step.status === "failed" ? XCircle : CheckCircle2;
                return (
                  <div key={name} className="flex items-start gap-3 px-4 py-3">
                    <Icon className={cx("mt-0.5 h-5 w-5 shrink-0", !step ? "text-ink-300" : step.status === "waiting" ? "text-clear" : step.status === "done" ? "text-go" : "text-alert")} />
                    <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{name}</div><div className="text-sm text-ink-400">{step ? step.message : "Skipped"}</div></div>
                    {step && step.ms > 0 && <span className="text-xs text-ink-300">{(step.ms / 1000).toFixed(1)}s</span>}
                  </div>
                );
              })}
              {shown.trace.filter((t) => t.agent === "Orchestrator").map((t, i) => <div key={i} className="px-4 py-3 text-sm text-alert">{t.message}</div>)}
              {shown.summary.top && shown.summary.top.length > 0 && (
                <div className="space-y-2 bg-paper px-4 py-3">
                  <div className="text-sm font-semibold">Top picks · run #{shown.id} · {fmtDate(shown.created_at)}</div>
                  {shown.summary.top.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 text-sm"><ScoreRing score={t.score} size={36} /><span className="font-medium">{t.title}</span><span className="text-ink-400">{t.company}</span><Link className="ml-auto text-signal" to={`/interview?job=${t.id}`}>Interview prep</Link></div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-clear" /><h2 className="font-semibold">Approval queue</h2>{queue.data && <span className="rounded-full bg-clear-50 px-2 text-xs font-bold text-clear-700">{queue.data.length}</span>}</div>
        {queue.loading ? <Spinner /> : !queue.data?.length ? <Empty title="Nothing waiting for approval" hint="Drafts appear here after an agent run. Edit them, then approve or reject each one." /> : (
          <div className="grid gap-4 xl:grid-cols-2">{queue.data.map((a) => <ActionCard key={`${a.id}-${a.updated_at}`} item={a} onChange={refresh} />)}</div>
        )}
      </section>
    </>
  );
}
