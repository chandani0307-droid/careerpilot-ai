export type Region = "all" | "india" | "abroad" | "remote";
export type AppStatus = "saved" | "drafted" | "applied" | "interview" | "offer" | "rejected";

export interface ProfileData {
  name: string; email: string; phone: string; linkedin: string; github: string; headline: string; summary: string;
  skills: string[]; experience_years: number; seniority: string; target_roles: string[]; education: string[];
  current_location: string; preferred_regions: string[]; preferred_locations: string[];
  strengths: string[]; gaps: string[]; suggestions: string[]; ats_score: number; ai_enhanced: boolean;
}
export interface ProfileOut { filename: string; updated_at: string | null; data: ProfileData; resume_chars: number }

export interface Job {
  id: string; title: string; company: string; location: string; region: Exclude<Region, "all">; url: string; apply_url: string;
  linkedin_url: string; hr_email: string; description: string; source: string; tags: string[]; salary: string; posted_at: string;
  match_score: number; match_reasons: string[]; missing_skills: string[]; ai_note: string; saved: boolean;
}
export interface JobSearchOut { jobs: Job[]; report: Record<string, number>; used_profile: boolean }

export interface Application {
  id: number; job_id: string; title: string; company: string; url: string; status: AppStatus; match_score: number;
  notes: string; cover_letter: string; tailored_summary: string; created_at: string; updated_at: string; applied_at: string | null;
}
export interface ActionItem {
  id: number; type: "email" | "linkedin" | "apply"; job_id: string; title: string; company: string; recipient: string; subject: string;
  body: string; target_url: string; status: "draft" | "pending" | "executed" | "rejected";
  result: { mode?: string; url?: string; message?: string; sent?: boolean; note?: string }; run_id: number | null; created_at: string; updated_at: string;
}
export interface TraceStep { agent: string; status: string; message: string; ms: number; detail: Record<string, unknown> }
export interface InterviewPrep {
  role: string; company: string; questions: { question: string; type: string; tip: string }[];
  technical_topics: string[]; star_stories: string[]; questions_to_ask: string[]; ai_enhanced?: boolean;
}
export interface AgentRun {
  id: number; goal: string; params: Record<string, unknown>; status: string; trace: TraceStep[]; created_at: string;
  summary: { queries?: string[]; jobs_found?: number; report?: Record<string, number>; top?: { id: string; title: string; company: string; score: number; region: string }[];
    interview?: (InterviewPrep & { job_id: string }) | null; pending_actions?: number; llm_provider?: string };
}
export interface Health { status: string; llm_provider: string; llm_error: string; job_providers: string[]; adzuna: boolean; smtp: boolean; mock_jobs_fallback: boolean; database: string }
export interface Analytics {
  kpis: { jobs: number; avg_match: number; high_matches: number; applications: number; pending_approvals: number; emails_sent: number; ats_score: number; agent_runs: number; response_rate: number };
  by_region: Record<string, number>; score_distribution: Record<string, number>; funnel: { stage: string; count: number }[];
  skill_demand: { skill: string; count: number; have: boolean }[]; skill_gaps: { skill: string; count: number }[]; actions_by_status: Record<string, number>;
}
export interface Tailored { summary: string; bullets: string[]; keywords: string[]; cover_letter: string }
