import { ChevronDown, GraduationCap, Loader2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../components/context";
import { Badge, ErrorBox, Field, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import type { InterviewPrep, Job } from "../lib/types";
import { cx, useLoad } from "../lib/utils";

export default function Interview() {
  const { profile } = useApp();
  const [params] = useSearchParams();
  const jobs = useLoad(() => api.get<Job[]>("/jobs?min_score=1"));
  const [jobId, setJobId] = useState(params.get("job") ?? "");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  async function generate(id = jobId) {
    setBusy(true); setError("");
    try { setPrep(await api.post<InterviewPrep>("/interview/prep", { job_id: id, role, company })); setOpen(0); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => { if (params.get("job")) void generate(params.get("job") ?? ""); /* eslint-disable-next-line */ }, []);

  const tone = (t: string) => (t.startsWith("tech") ? "blue" : t.startsWith("system") ? "amber" : "green");
  return (
    <>
      <PageHeader title="Interview prep" subtitle="Questions, answer tips and stories to prepare, tailored to the job and your skills." />
      <ErrorBox message={error} />
      <section className="card mb-6 grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <Field label="Job from your list"><select value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Custom role…</option>{(jobs.data ?? []).map((j) => <option key={j.id} value={j.id}>{j.title} @ {j.company}</option>)}</select></Field>
        <Field label="Role"><input disabled={!!jobId} value={role} onChange={(e) => setRole(e.target.value)} placeholder={(profile?.data.target_roles ?? [])[0] ?? "Backend Engineer"} /></Field>
        <Field label="Company"><input disabled={!!jobId} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional" /></Field>
        <button className="btn btn-primary" disabled={busy} onClick={() => generate()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate</button>
      </section>

      {!prep ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center"><GraduationCap className="h-8 w-8 text-ink-300" /><p className="font-semibold">Pick a job and generate your prep sheet</p></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-2 lg:col-span-2">
            <h2 className="font-semibold">{prep.role} · {prep.company}</h2>
            {prep.questions.map((q, i) => (
              <div key={i} className="card">
                <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <div className="min-w-0 flex-1"><Badge tone={tone(q.type)}>{q.type}</Badge><p className="mt-1.5 font-medium">{q.question}</p></div>
                  <ChevronDown className={cx("mt-1 h-4 w-4 shrink-0 text-ink-400 transition", open === i && "rotate-180")} />
                </button>
                {open === i && <div className="border-t border-line bg-paper px-4 py-3 text-sm text-ink-700"><b>How to answer:</b> {q.tip}</div>}
              </div>
            ))}
          </section>
          <aside className="space-y-4">
            {([["Technical topics to revise", prep.technical_topics], ["STAR stories to prepare", prep.star_stories], ["Questions to ask them", prep.questions_to_ask]] as const).map(([title, list]) => (
              <div key={title} className="card p-4"><h3 className="mb-2 font-semibold">{title}</h3><ul className="space-y-1.5 text-sm text-ink-700">{list.map((x) => <li key={x}>• {x}</li>)}</ul></div>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
