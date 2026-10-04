import { Bookmark, Building2, ExternalLink, Linkedin, Mail, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cx, regionLabel } from "../lib/utils";
import type { Job } from "../lib/types";
import { Badge, ScoreRing } from "./ui";

export default function JobCard({ job, onSave, onDraft }: { job: Job; onSave: (j: Job) => void; onDraft?: (j: Job, t: "email" | "linkedin" | "apply") => void }) {
  return (
    <article className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <ScoreRing score={job.match_score} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{job.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-400">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.company || "Unknown"}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
            {job.salary && <span>{job.salary}</span>}
          </p>
        </div>
        <button onClick={() => onSave(job)} aria-label={job.saved ? "Remove from saved" : "Save job"} className={cx("rounded-lg p-2 hover:bg-paper", job.saved ? "text-signal" : "text-ink-300")}>
          <Bookmark className="h-4 w-4" fill={job.saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge tone={job.region === "india" ? "green" : job.region === "abroad" ? "blue" : "neutral"}>{regionLabel[job.region]}</Badge>
        {job.source === "mock" && <Badge tone="amber">Sample listing</Badge>}
        {job.tags.slice(0, 5).map((t) => <Badge key={t}>{t}</Badge>)}
      </div>

      <ul className="space-y-0.5 text-sm text-ink-700">
        {job.match_reasons.slice(0, 2).map((r) => <li key={r}>• {r}</li>)}
        {job.missing_skills.length > 0 && <li className="text-ink-400">• Missing: {job.missing_skills.slice(0, 4).join(", ")}</li>}
      </ul>
      {job.ai_note && <p className="flex gap-2 rounded-lg bg-signal-50 px-3 py-2 text-sm text-signal-600"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" />{job.ai_note}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <a href={job.apply_url || job.url} target="_blank" rel="noreferrer noopener" className="btn btn-primary"><ExternalLink className="h-4 w-4" /> View & apply</a>
        {onDraft && <button className="btn btn-ghost" onClick={() => onDraft(job, "email")}><Mail className="h-4 w-4" /> Draft HR email</button>}
        {onDraft && <button className="btn btn-ghost" onClick={() => onDraft(job, "linkedin")}><Linkedin className="h-4 w-4" /> LinkedIn note</button>}
        <Link to={`/interview?job=${job.id}`} className="ml-auto text-sm font-medium text-signal hover:underline">Prep interview</Link>
      </div>
    </article>
  );
}
