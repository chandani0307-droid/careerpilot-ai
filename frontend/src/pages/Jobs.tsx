import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../components/context";
import JobCard from "../components/JobCard";
import { Empty, ErrorBox, PageHeader, Segmented, Spinner } from "../components/ui";
import { api } from "../lib/api";
import type { Job, JobSearchOut, Region } from "../lib/types";

export default function Jobs() {
  const { toast, profile } = useApp();
  const nav = useNavigate();
  const [region, setRegion] = useState<Region>("all");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [report, setReport] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try { setJobs(await api.get<Job[]>(`/jobs?region=${region}&min_score=${minScore}`)); setError(""); } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [region, minScore]);
  useEffect(() => { void loadSaved(); }, [loadSaved]);

  async function search() {
    setSearching(true); setError("");
    try {
      const r = await api.post<JobSearchOut>("/jobs/search", { query, region, location, limit: 40 });
      setJobs(r.jobs.filter((j) => j.match_score >= minScore)); setReport(r.report);
      if (!r.used_profile) toast("Upload a resume to get match scores.", "err");
    } catch (e) { setError((e as Error).message); } finally { setSearching(false); }
  }
  async function save(j: Job) {
    try { const u = await api.post<Job>(`/jobs/${j.id}/save`); setJobs((js) => js.map((x) => (x.id === u.id ? u : x))); toast(u.saved ? "Saved to your tracker" : "Removed from saved"); } catch (e) { toast((e as Error).message, "err"); }
  }
  async function draft(j: Job, type: "email" | "linkedin" | "apply") {
    try { await api.post("/actions/draft", { job_id: j.id, type }); toast("Draft created in Outreach"); nav("/outreach"); } catch (e) { toast((e as Error).message, "err"); }
  }

  return (
    <>
      <PageHeader title="Jobs" subtitle="Live listings from free job boards and RSS feeds, scored against your skills." />
      <div className="card mb-5 space-y-3 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_12rem_auto]" onSubmit={(e) => { e.preventDefault(); void search(); }}>
          <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" /><input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={profile ? "Leave blank to search by your profile, or try “React developer”" : "Search roles or skills, e.g. “Python developer”"} aria-label="Search" /></div>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or country" aria-label="Location" />
          <button className="btn btn-primary" disabled={searching}>{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search jobs</button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented<Region> value={region} onChange={setRegion} options={[{ value: "all", label: "All" }, { value: "india", label: "India" }, { value: "abroad", label: "Abroad" }, { value: "remote", label: "Remote" }]} />
          <label className="flex items-center gap-2 text-sm text-ink-700">Min match <input type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(+e.target.value)} className="w-32 !p-0" /> <b className="w-8">{minScore}</b></label>
        </div>
        {report && <p className="text-xs text-ink-400">Sources: {Object.entries(report).filter(([k]) => k !== "live_total").map(([k, v]) => `${k} ${v}`).join(" · ")}. {report.mock ? "Sample listings were added because few live results matched." : ""}</p>}
      </div>
      <ErrorBox message={error} />
      {loading || searching ? <Spinner label={searching ? "Searching job boards…" : undefined} /> : jobs.length === 0 ? (
        <Empty icon={<Search className="h-8 w-8" />} title="No jobs yet" hint="Press “Search jobs” to fetch listings. With no API keys, sample listings fill in so you can try the whole flow." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">{jobs.map((j) => <JobCard key={j.id} job={j} onSave={save} onDraft={draft} />)}</div>
      )}
    </>
  );
}
