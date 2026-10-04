import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "../components/context";
import { Empty, ErrorBox, Modal, PageHeader, ScoreRing, Spinner, Field } from "../components/ui";
import { api } from "../lib/api";
import type { AppStatus, Application } from "../lib/types";
import { fmtDate, useLoad } from "../lib/utils";

const COLUMNS: { key: AppStatus; label: string; dot: string }[] = [
  { key: "saved", label: "Saved", dot: "bg-ink-300" }, { key: "drafted", label: "Drafted", dot: "bg-clear" }, { key: "applied", label: "Applied", dot: "bg-signal" },
  { key: "interview", label: "Interview", dot: "bg-go" }, { key: "offer", label: "Offer", dot: "bg-go" }, { key: "rejected", label: "Rejected", dot: "bg-alert" },
];

export default function Applications() {
  const { toast } = useApp();
  const { data, error, loading, reload } = useLoad(() => api.get<Application[]>("/applications"));
  const [open, setOpen] = useState<Application | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", url: "" });

  async function move(a: Application, status: AppStatus) {
    try { await api.patch(`/applications/${a.id}`, { status }); await reload(); } catch (e) { toast((e as Error).message, "err"); }
  }
  async function saveNotes() {
    if (!open) return;
    try { await api.patch(`/applications/${open.id}`, { notes: open.notes, cover_letter: open.cover_letter }); toast("Saved"); setOpen(null); await reload(); } catch (e) { toast((e as Error).message, "err"); }
  }
  async function add() {
    try { await api.post("/applications", form); setAdding(false); setForm({ title: "", company: "", url: "" }); await reload(); } catch (e) { toast((e as Error).message, "err"); }
  }
  async function remove(a: Application) { await api.del(`/applications/${a.id}`); setOpen(null); await reload(); }

  return (
    <>
      <PageHeader title="Applications" subtitle="Track every role from saved to offer. Change a stage with the dropdown on each card." actions={<button className="btn btn-dark" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add application</button>} />
      <ErrorBox message={error} />
      {loading ? <Spinner /> : !data?.length ? <Empty title="No applications yet" hint="Save a job from the Jobs page, or let the agent draft applications for your top matches." /> : (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
          <div className="grid min-w-[72rem] grid-cols-6 gap-3">
            {COLUMNS.map((col) => {
              const items = data.filter((a) => a.status === col.key);
              return (
                <div key={col.key} className="rounded-card bg-ink/[0.04] p-2.5">
                  <div className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold"><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.label}<span className="ml-auto text-xs font-normal text-ink-400">{items.length}</span></div>
                  <div className="space-y-2">
                    {items.map((a) => (
                      <div key={a.id} className="card p-3">
                        <button className="block w-full text-left" onClick={() => setOpen(a)}>
                          <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><div className="text-sm font-semibold leading-snug">{a.title}</div><div className="truncate text-xs text-ink-400">{a.company}</div></div>{a.match_score > 0 && <ScoreRing score={a.match_score} size={34} />}</div>
                        </button>
                        <div className="mt-2 flex items-center gap-2">
                          <select className="!py-1 text-xs" value={a.status} aria-label="Change stage" onChange={(e) => move(a, e.target.value as AppStatus)}>{COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                          {a.url && <a href={a.url} target="_blank" rel="noreferrer noopener" aria-label="Open job page" className="text-ink-400 hover:text-signal"><ExternalLink className="h-4 w-4" /></a>}
                        </div>
                        <div className="mt-1 text-[11px] text-ink-300">Updated {fmtDate(a.updated_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {open && (
        <Modal title={`${open.title} · ${open.company}`} onClose={() => setOpen(null)} footer={<><button className="btn btn-danger mr-auto" onClick={() => remove(open)}><Trash2 className="h-4 w-4" /> Delete</button><button className="btn btn-ghost" onClick={() => setOpen(null)}>Cancel</button><button className="btn btn-primary" onClick={saveNotes}>Save</button></>}>
          <div className="space-y-3">
            <Field label="Notes"><textarea rows={3} value={open.notes} onChange={(e) => setOpen({ ...open, notes: e.target.value })} placeholder="Recruiter name, follow-up dates, salary talk…" /></Field>
            <Field label="Cover letter"><textarea rows={10} value={open.cover_letter} onChange={(e) => setOpen({ ...open, cover_letter: e.target.value })} placeholder="No cover letter drafted yet. Run the agent or use Outreach." /></Field>
          </div>
        </Modal>
      )}
      {adding && (
        <Modal title="Add application" onClose={() => setAdding(false)} footer={<><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" disabled={!form.title} onClick={add}>Add</button></>}>
          <div className="space-y-3"><Field label="Job title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field><Field label="Company"><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field><Field label="Job link"><input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></Field></div>
        </Modal>
      )}
    </>
  );
}
