import { Linkedin, Loader2, Mail, Send, Wand2 } from "lucide-react";
import { useState } from "react";
import { ActionCard } from "../components/Approvals";
import { useApp } from "../components/context";
import { Empty, ErrorBox, PageHeader, Segmented, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { ActionItem, Job } from "../lib/types";
import { useLoad } from "../lib/utils";

type Tab = "email" | "linkedin" | "apply";

export default function Outreach() {
  const { toast, refreshPending } = useApp();
  const [tab, setTab] = useState<Tab>("email");
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const actions = useLoad(() => api.get<ActionItem[]>(`/actions?type=${tab}`), [tab]);
  const jobs = useLoad(() => api.get<Job[]>("/jobs?min_score=1"));

  async function generate() {
    if (!jobId) return;
    setBusy(true);
    try { await api.post("/actions/draft", { job_id: jobId, type: tab }); toast("Draft ready. Edit it, then request approval."); await actions.reload(); } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  }
  const refresh = async () => { await actions.reload(); await refreshPending(); };
  const visible = (actions.data ?? []).filter((a) => a.status !== "rejected");

  return (
    <>
      <PageHeader title="Outreach" subtitle="HR emails, LinkedIn notes and application cover letters. Every draft is editable and needs your approval to run." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: "email", label: "HR emails" }, { value: "linkedin", label: "LinkedIn" }, { value: "apply", label: "Cover letters" }]} />
        <div className="flex flex-wrap items-center gap-2">
          <select className="!w-64" value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="Job to draft for">
            <option value="">Choose a job…</option>
            {(jobs.data ?? []).map((j) => <option key={j.id} value={j.id}>{j.match_score}% · {j.title} @ {j.company}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!jobId || busy} onClick={generate}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate draft</button>
        </div>
      </div>
      <ErrorBox message={actions.error} />
      {actions.loading ? <Spinner /> : visible.length === 0 ? (
        <Empty icon={tab === "email" ? <Mail className="h-8 w-8" /> : tab === "linkedin" ? <Linkedin className="h-8 w-8" /> : <Send className="h-8 w-8" />} title="No drafts yet" hint="Pick a job above, or run the agent to prepare drafts for your best matches." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{visible.map((a) => <ActionCard key={`${a.id}-${a.updated_at}`} item={a} onChange={refresh} />)}</div>
      )}
    </>
  );
}
