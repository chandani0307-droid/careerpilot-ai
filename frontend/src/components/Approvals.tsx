import { Check, ExternalLink, Linkedin, Mail, Send, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import type { ActionItem } from "../lib/types";
import { cx } from "../lib/utils";
import { useApp } from "./context";
import { Badge, Field, Modal } from "./ui";

const TYPE = { email: { label: "HR email", icon: Mail }, linkedin: { label: "LinkedIn note", icon: Linkedin }, apply: { label: "Application", icon: Send } };

/** Editable action card. External effects only happen through the explicit "Approve & run" confirmation. */
export function ActionCard({ item, onChange }: { item: ActionItem; onChange: () => void }) {
  const { toast, refreshPending } = useApp();
  const [draft, setDraft] = useState(item);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const T = TYPE[item.type];
  const locked = item.status === "executed" || item.status === "rejected";

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast(ok); await refreshPending(); onChange(); } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); setConfirming(false); }
  }
  const save = () => api.patch(`/actions/${item.id}`, { recipient: draft.recipient, subject: draft.subject, body: draft.body });

  async function approve() {
    setBusy(true);
    try {
      await save();
      const r = await api.post<ActionItem>(`/actions/${item.id}/approve`, { confirm: true, recipient: draft.recipient });
      toast(r.result.message || "Approved");
      if (r.result.url) window.open(r.result.url, "_blank", "noopener");
      if (r.type === "linkedin" && r.body) void navigator.clipboard?.writeText(r.body);
      await refreshPending(); onChange();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); setConfirming(false); }
  }

  return (
    <div className={cx("card overflow-hidden", item.status === "pending" && "border-l-4 border-l-clear")}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <T.icon className="h-4 w-4 text-ink-400" />
        <span className="text-sm font-semibold">{T.label}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-400">{item.title}</span>
        <Badge tone={item.status === "pending" ? "amber" : item.status === "executed" ? "green" : item.status === "rejected" ? "red" : "neutral"}>
          {item.status === "pending" ? "Needs your approval" : item.status === "executed" ? "Approved" : item.status === "draft" ? "Draft" : "Rejected"}
        </Badge>
      </div>
      <div className="space-y-3 p-4">
        {item.type === "email" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="To (HR email)"><input value={draft.recipient} disabled={locked} onChange={(e) => setDraft({ ...draft, recipient: e.target.value })} placeholder="hr@company.com" type="email" /></Field>
            <Field label="Subject"><input value={draft.subject} disabled={locked} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field>
          </div>
        )}
        <Field label={item.type === "linkedin" ? "Connection note (300 characters max)" : item.type === "apply" ? "Cover letter" : "Message"}>
          <textarea rows={item.type === "linkedin" ? 3 : 8} maxLength={item.type === "linkedin" ? 300 : undefined} value={draft.body} disabled={locked} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </Field>
        {item.type === "linkedin" && item.target_url && <a className="inline-flex items-center gap-1 text-sm text-signal hover:underline" href={item.target_url} target="_blank" rel="noreferrer noopener"><ExternalLink className="h-3.5 w-3.5" /> Find recruiters at {item.company} on LinkedIn</a>}
        {item.result?.message && <p className="rounded-lg bg-paper px-3 py-2 text-sm text-ink-700">{item.result.message}{item.result.url && item.type === "email" && !item.result.sent && <> <a className="font-medium text-signal underline" href={item.result.url}>Open draft</a></>}</p>}
        {!locked && (
          <div className="flex flex-wrap gap-2">
            {item.status === "draft" && <button className="btn btn-dark" disabled={busy} onClick={() => run(async () => { await save(); await api.post(`/actions/${item.id}/submit`); }, "Sent to approval queue")}><ShieldCheck className="h-4 w-4" /> Request approval</button>}
            {item.status === "pending" && <button className="btn btn-go" disabled={busy} onClick={() => setConfirming(true)}><Check className="h-4 w-4" /> Approve & run</button>}
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(save, "Draft saved")}>Save edits</button>
            <button className="btn btn-danger ml-auto" disabled={busy} onClick={() => run(() => api.post(`/actions/${item.id}/reject`), "Rejected")}><X className="h-4 w-4" /> Reject</button>
          </div>
        )}
      </div>
      {confirming && (
        <Modal title="Approve this action?" onClose={() => setConfirming(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setConfirming(false)}>Cancel</button><button className="btn btn-go" disabled={busy} onClick={approve}><Check className="h-4 w-4" /> Yes, approve</button></>}>
          <p className="text-sm text-ink-700">
            {item.type === "email" && <>This will email <b>{draft.recipient || "(no recipient)"}</b>. If SMTP isn't configured, your email app opens with the draft instead.</>}
            {item.type === "linkedin" && <>CareerPilot can't message on LinkedIn for you. Approving opens the recruiter search and copies your note to the clipboard.</>}
            {item.type === "apply" && <>This opens the employer's apply page and marks the application as <b>applied</b>. You submit the form yourself.</>}
          </p>
        </Modal>
      )}
    </div>
  );
}
