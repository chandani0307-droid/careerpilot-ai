# CareerPilot AI

An agentic AI job-search assistant. Upload your resume, and a team of agents (built with **LangGraph**) finds matching jobs in **India, abroad and remote**, scores them, drafts tailored cover letters, HR emails and LinkedIn notes, and prepares you for interviews. **Nothing leaves the app until you approve it.**

**Stack:** React + TypeScript + Vite + Tailwind · FastAPI + Pydantic · LangGraph + LangChain · SQLAlchemy (SQLite by default, PostgreSQL-ready)

## Quick start

Requirements: **Python 3.10+** and **Node 18+**. No API key is needed to try everything.

```bash
# 1. (optional) configuration
cp .env.example .env            # Windows: copy .env.example .env

# 2. backend  → http://localhost:8000  (API docs at /docs)
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. frontend → http://localhost:5173   (new terminal)
cd frontend
npm install
npm run dev
```

Shortcuts on macOS/Linux: `./start-backend.sh` and `./start-frontend.sh`.

Then open http://localhost:5173, go to **Resume**, and upload `sample_resume.txt` (or your own PDF/DOCX). Next open **Agent** and press **Run agent**.

## Free AI (optional but recommended)

Without a key the app uses offline templates, so drafts are generic. For real tailoring, add a free **Google Gemini** key from https://aistudio.google.com/apikey:

```
GEMINI_API_KEY=your_key_here     # in .env, never in code
```

Restart the backend. The top bar shows `AI: gemini` when it is active. Prefer local? Set `LLM_PROVIDER=ollama`, install Ollama, run `ollama pull llama3.1` and `pip install langchain-ollama`. If a model call fails or is rate-limited, every feature falls back to templates instead of erroring.

## How the agent works

```
Planner → Job Scout → Matcher → Resume & Cover Letter Writer → Outreach Agent → Interview Coach → Approval Gate
```

Defined in `backend/app/agents/graph.py` as a LangGraph `StateGraph` with conditional exits (no resume → stop; no jobs → stop). Agents only **read, score and draft**. Drafts are stored as `Action` rows with status `pending`.

### Human approval
The only code path that touches the outside world is `POST /api/actions/{id}/approve`, which requires `confirm: true` from the UI's confirmation dialog:

| Action | What approval does |
|---|---|
| **Email** | Sends via SMTP if configured, otherwise opens a `mailto:` draft in your email app |
| **LinkedIn** | LinkedIn forbids automation, so it opens a recruiter search and copies your note |
| **Apply** | Opens the employer's apply page and marks the application *applied* (you submit the form) |

## Job sources (all free)

| Source | Key needed | Coverage |
|---|---|---|
| Remotive, RemoteOK, Arbeitnow | No | Remote / Europe |
| RSS feeds (`JOB_RSS_FEEDS`) | No | Anything you add |
| Adzuna | Free key | **India (`in`)**, UK, US and more |
| Sample jobs | No | Fallback so the app always works |

Free APIs have thin India coverage. For best India results, add the Adzuna key and your own RSS feeds. Listings marked **Sample listing** are placeholders with fake links. HR emails are never guessed: add the recipient yourself, or set `HUNTER_API_KEY` to use `GET /api/jobs/{id}/contacts?domain=company.com`.

## Pages

Dashboard · Jobs (India/Abroad/Remote filters, match scores, apply links) · Resume (analysis, ATS score, skills) · Agent (workflow + approval queue) · Applications (kanban tracker) · Outreach (HR email, LinkedIn, cover letters) · Interview prep · Analytics. The floating **Ask CareerPilot** chat sits bottom-left.

## Project layout

```
backend/app/
  main.py            FastAPI app
  core/              config (.env), database
  models/            SQLAlchemy tables + Pydantic schemas
  routers/           profile, jobs, tracker (applications + approvals), agent, analytics
  agents/graph.py    LangGraph workflow
  services/
    llm.py           LangChain wrapper (Gemini / Ollama / none)
    writer.py        AI drafting with offline fallbacks
    fallbacks.py     templates used when no AI is available
    resume_parser.py skills.py matching.py   pure-Python analysis and scoring
    jobs/            providers.py (add new sources here), aggregator.py, mock_jobs.py
    mailer.py contacts.py store.py
  tests/             offline unit tests
frontend/src/        pages/, components/, lib/ (api client, types)
```

## PostgreSQL

```
pip install "psycopg[binary]"
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/careerpilot
```
Tables are created on startup. For production, switch to Alembic migrations.

## Tests

```bash
cd backend && pytest
```

## Notes and limits

- Single-user app: one profile, no login. Add authentication before exposing it publicly.
- Resume text and drafts stay in your local database; when an AI provider is enabled, resume text is sent to that provider.
- Scanned (image-only) PDFs are not OCR'd. Use a text PDF or DOCX.
- Match scores come from transparent skill/title/region rules (`services/matching.py`), not from the LLM.
- Check each job board's terms before adding scrapers; this project only uses public APIs and feeds.
