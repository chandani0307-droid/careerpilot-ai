import { ArrowRight, Bot, Briefcase, FileText, ListChecks, ShieldCheck, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../components/context";
import { Badge, Empty, ErrorBox, PageHeader, ScoreRing, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { Analytics, Application, Job } from "../lib/types";
import { fmtDate, regionLabel, useLoad } from "../lib/utils";

export default function Dashboard() {
  const { profile, pending, ready } = useApp();
  const a = useLoad(() => api.get<Analytics>("/analytics/summary"));
  const jobs = useLoad(() => api.get<Job[]>("/jobs?min_score=1"));
  const apps = useLoad(() => api.get<Application[]>("/applications"));
  if (!ready) return <Spinner />;
  const k = a.data?.kpis;
  const top = (jobs.data ?? []).slice(0, 4);

  return (
    <>
      <PageHeader title={profile?.data.name ? `Welcome back, ${profile.data.name.split(" ")[0]}` : "Welcome to CareerPilot"} subtitle="Your job search, run by a team of AI agents. You approve every step that leaves this app." />
      <ErrorBox message={a.error} />

      {!profile ? (
        <Empty icon={<Upload className="h-8 w-8" />} title="Start with your resume" hint="Upload a PDF or DOCX. CareerPilot extracts your skills, scores your resume for ATS, and starts matching jobs." action={<Link to="/resume" className="btn btn-primary">Upload resume</Link>} />
      ) : (
        <>
          {pending > 0 && (
            <Link to="/agent" className="mb-6 flex items-center gap-3 rounded-card border border-clear/40 border-l-4 border-l-clear bg-clear-50 px-4 py-3 text-sm">
              <ShieldCheck className="h-5 w-5 text-clear-700" />
              <span className="flex-1"><b>{pending} drafts are waiting for your approval.</b> Review them before anything is sent.</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Jobs found", k?.jobs ?? 0, "/jobs"], ["Strong matches (75+)", k?.high_matches ?? 0, "/jobs"],
              ["Applications", k?.applications ?? 0, "/applications"], ["Resume ATS score", `${profile.data.ats_score}/100`, "/resume"],
            ].map(([label, value, to]) => (
              <Link key={String(label)} to={String(to)} className="card p-4 transition hover:border-signal/50">
                <div className="text-2xl font-bold">{value}</div>
                <div className="mt-1 text-sm text-ink-400">{label}</div>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Best matches right now</h2><Link to="/jobs" className="text-sm font-medium text-signal">All jobs</Link></div>
              {jobs.loading ? <Spinner /> : top.length === 0 ? (
                <Empty icon={<Bot className="h-8 w-8" />} title="No jobs yet" hint="Run the agent once and it will search India, abroad and remote boards for you." action={<Link to="/agent" className="btn btn-primary">Run the agent</Link>} />
              ) : (
                <div className="space-y-3">
                  {top.map((j) => (
                    <a key={j.id} href={j.apply_url || j.url} target="_blank" rel="noreferrer noopener" className="card flex items-center gap-4 p-4 transition hover:border-signal/50">
                      <ScoreRing score={j.match_score} size={48} />
                      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{j.title}</div><div className="truncate text-sm text-ink-400">{j.company} · {j.location}</div></div>
                      <Badge>{regionLabel[j.region]}</Badge>
                    </a>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="mb-3 font-semibold">Next steps</h2>
              <div className="card divide-y divide-line">
                {[
                  { to: "/agent", icon: Bot, t: "Run the agent", d: "Search, match and draft in one go" },
                  { to: "/resume", icon: FileText, t: "Improve your resume", d: `${profile.data.suggestions.length} suggestions` },
                  { to: "/jobs", icon: Briefcase, t: "Browse jobs", d: "India, abroad or remote" },
                  { to: "/applications", icon: ListChecks, t: "Update your tracker", d: `${apps.data?.length ?? 0} applications` },
                ].map(({ to, icon: I, t, d }) => (
                  <Link key={t} to={to} className="flex items-center gap-3 p-3.5 hover:bg-paper"><I className="h-4 w-4 text-signal" /><div className="flex-1"><div className="text-sm font-semibold">{t}</div><div className="text-xs text-ink-400">{d}</div></div></Link>
                ))}
              </div>
              {(apps.data ?? []).slice(0, 3).length > 0 && (
                <div className="mt-4 text-sm text-ink-400">Latest: {(apps.data ?? []).slice(0, 3).map((x) => `${x.company} (${x.status}, ${fmtDate(x.updated_at)})`).join(" · ")}</div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
