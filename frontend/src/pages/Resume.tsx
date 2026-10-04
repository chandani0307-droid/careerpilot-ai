import { CheckCircle2, FileText, Loader2, Pencil, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../components/context";
import { Badge, ErrorBox, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import type { ProfileOut } from "../lib/types";
import { scoreTone } from "../lib/utils";

export default function Resume() {
  const { profile, setProfile, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ headline: "", skills: "", roles: "", locations: "" });
  const input = useRef<HTMLInputElement>(null);
  const d = profile?.data;

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try { setProfile(await api.upload<ProfileOut>("/resume/upload", file)); toast("Resume analysed"); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function saveEdits() {
    const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
    try {
      setProfile(await api.patch<ProfileOut>("/profile", { headline: form.headline, skills: split(form.skills), target_roles: split(form.roles), preferred_locations: split(form.locations) }));
      setEditing(false); toast("Profile updated");
    } catch (e) { toast((e as Error).message, "err"); }
  }

  const tone = scoreTone(d?.ats_score ?? 0);
  return (
    <>
      <PageHeader title="Resume" subtitle="Upload once. CareerPilot extracts your profile, rates your ATS readiness and uses it for matching and drafts." />
      <ErrorBox message={error} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void upload(e.dataTransfer.files[0]); }}
        className={`card mb-6 flex flex-col items-center gap-3 border-2 border-dashed px-6 py-10 text-center ${drag ? "border-signal bg-signal-50" : "border-line"}`}>
        {busy ? <Loader2 className="h-8 w-8 animate-spin text-signal" /> : <Upload className="h-8 w-8 text-ink-300" />}
        <div><p className="font-semibold">{busy ? "Analysing your resume…" : profile ? `Current: ${profile.filename}` : "Drop your resume here"}</p><p className="text-sm text-ink-400">PDF, DOCX or TXT, up to 5 MB. Text is processed by your own backend{d?.ai_enhanced ? "" : " (offline mode — add a Gemini key for deeper analysis)"}.</p></div>
        <input ref={input} type="file" hidden accept=".pdf,.docx,.txt,.md" onChange={(e) => void upload(e.target.files?.[0])} />
        <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}><FileText className="h-4 w-4" /> {profile ? "Replace resume" : "Choose file"}</button>
      </div>

      {d && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold">{d.name || "Candidate"}</h2><p className="text-sm text-ink-400">{d.headline}</p><p className="mt-1 text-xs text-ink-400">{[d.email, d.phone, d.current_location].filter(Boolean).join(" · ")}</p></div>
                <button className="btn btn-ghost" onClick={() => { setForm({ headline: d.headline, skills: d.skills.join(", "), roles: d.target_roles.join(", "), locations: d.preferred_locations.join(", ") }); setEditing(!editing); }}><Pencil className="h-4 w-4" /> Edit</button>
              </div>
              {d.summary && <p className="mt-3 text-sm text-ink-700">{d.summary}</p>}
              {editing && (
                <div className="mt-4 space-y-3 rounded-lg bg-paper p-4">
                  {([["headline", "Headline"], ["skills", "Skills (comma separated)"], ["roles", "Target roles"], ["locations", "Preferred cities"]] as const).map(([k, label]) => (
                    <label key={k} className="block text-sm font-medium">{label}<input className="mt-1" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
                  ))}
                  <button className="btn btn-dark" onClick={saveEdits}>Save profile</button>
                </div>
              )}
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-semibold">Skills detected ({d.skills.length})</h2>
              <div className="flex flex-wrap gap-1.5">{d.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <div><div className="text-ink-400">Experience</div><b>{d.experience_years} years</b></div>
                <div><div className="text-ink-400">Level</div><b>{d.seniority}</b></div>
                <div><div className="text-ink-400">Target roles</div><b>{d.target_roles.join(", ")}</b></div>
              </div>
            </section>
            <div className="grid gap-6 sm:grid-cols-2">
              <section className="card p-5"><h2 className="mb-2 font-semibold">Strengths</h2><ul className="space-y-1.5 text-sm">{d.strengths.map((s) => <li key={s} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-go" />{s}</li>)}</ul></section>
              <section className="card p-5"><h2 className="mb-2 font-semibold">Gaps to close</h2><ul className="space-y-1.5 text-sm text-ink-700">{d.gaps.map((s) => <li key={s}>• {s}</li>)}</ul></section>
            </div>
          </div>
          <aside className="space-y-6">
            <section className="card p-5 text-center">
              <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${tone.bg} ${tone.text}`}>{d.ats_score}</div>
              <p className="mt-2 font-semibold">ATS readiness</p><p className="text-xs text-ink-400">How well automated screening can read your resume</p>
            </section>
            <section className="card p-5"><h2 className="mb-2 font-semibold">How to improve</h2><ul className="space-y-2 text-sm text-ink-700">{d.suggestions.map((s) => <li key={s}>• {s}</li>)}</ul></section>
            <Link to="/agent" className="btn btn-primary w-full">Find jobs with the agent</Link>
          </aside>
        </div>
      )}
    </>
  );
}
