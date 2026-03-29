# Backend — Developer Guide

Python 3.12 / FastAPI service providing the REST API, scheduled code review jobs, and all analysis logic for the Java Code Review Platform.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Configuration](#configuration)
- [Database](#database)
- [API Reference](#api-reference)
- [Analysis Engine](#analysis-engine)
- [Scheduler](#scheduler)
- [Security Analyzer](#security-analyzer)
- [Tech Debt Analyzer](#tech-debt-analyzer)
- [AI Reviewer](#ai-reviewer)
- [Adding a New Analyzer](#adding-a-new-analyzer)
- [Adding a New API Endpoint](#adding-a-new-api-endpoint)
- [Code Conventions](#code-conventions)

---

## Tech Stack

| Library | Version | Role |
|---------|---------|------|
| [FastAPI](https://fastapi.tiangolo.com/) | 0.111.0 | Web framework, automatic OpenAPI docs |
| [SQLAlchemy](https://www.sqlalchemy.org/) | 2.0.30 | ORM, connection pooling |
| [psycopg2-binary](https://pypi.org/project/psycopg2-binary/) | 2.9.9 | PostgreSQL driver |
| [Pydantic](https://docs.pydantic.dev/) | 2.7.4 | Request/response validation and serialisation |
| [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | 2.3.4 | Environment-variable configuration |
| [PyGithub](https://pygithub.readthedocs.io/) | 2.3.0 | GitHub REST API v3 client |
| [APScheduler](https://apscheduler.readthedocs.io/) | 3.10.4 | Background cron scheduler |
| [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-python) | 0.28.0 | Claude API for AI code review |
| [cryptography](https://cryptography.io/) | 42.0.8 | Fernet AES-256 token encryption |
| [python-dotenv](https://pypi.org/project/python-dotenv/) | 1.0.1 | `.env` file loading |
| [httpx](https://www.python-httpx.org/) | 0.27.0 | HTTP client (used in testing) |
| [uvicorn](https://www.uvicorn.org/) | 0.30.0 | ASGI server with hot reload |

---

## Project Structure

```
backend/
├── Dockerfile
├── requirements.txt
└── app/
    ├── main.py               # FastAPI app factory, lifespan, CORS, router registration
    ├── config.py             # Pydantic Settings — all env vars with defaults
    ├── database.py           # SQLAlchemy engine (with retry), SessionLocal, get_db()
    │
    ├── models/               # SQLAlchemy ORM table definitions
    │   ├── repository.py     # repositories table
    │   ├── commit.py         # commits table
    │   ├── review.py         # reviews table
    │   ├── finding.py        # findings + finding_rules tables
    │   ├── developer.py      # developers + developer_commits tables
    │   ├── schedule_config.py# schedule_configs table
    │   └── tech_debt.py      # tech_debt_snapshots table
    │
    ├── schemas/              # Pydantic request/response models
    │   ├── repository.py     # RepositoryCreate, RepositoryOut, ScheduleConfigOut ...
    │   ├── review.py         # ReviewOut, CommitOut
    │   ├── finding.py        # FindingOut
    │   ├── developer.py      # DeveloperOut
    │   └── dashboard.py      # KPISummary, DashboardTrends, TrendPoint
    │
    ├── api/                  # FastAPI route handlers (one file per resource)
    │   ├── repos.py          # /api/v1/repositories  (CRUD + schedule + trigger)
    │   ├── reviews.py        # /api/v1/reviews
    │   ├── findings.py       # /api/v1/findings
    │   ├── developers.py     # /api/v1/developers
    │   └── dashboard.py      # /api/v1/dashboard/summary  /trends
    │
    ├── services/             # Business logic — no HTTP concerns
    │   ├── analysis_engine.py    # Orchestrator: fetch → analyse → persist
    │   ├── github_service.py     # PyGithub wrapper — commit and diff fetching
    │   ├── security_analyzer.py  # Regex-based security pattern detection
    │   ├── techdebt_analyzer.py  # Regex-based tech debt detection
    │   ├── ai_reviewer.py        # Claude / OpenAI LLM review
    │   └── crypto_service.py     # Fernet encrypt/decrypt for GitHub tokens
    │
    └── scheduler/
        └── scheduler.py      # APScheduler setup, job registration, shutdown
```

---

## Running Locally (without Docker)

Useful for fast iteration on API logic without rebuilding images.

### Prerequisites

- Python 3.12+
- A running PostgreSQL instance (can use the Docker Compose one: `docker compose up -d postgres`)

### Steps

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate        # Linux/macOS
.venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create a local .env (copy from root)
cp ../.env.example .env
# Edit .env — set DB_HOST=localhost if Postgres is running locally

# Start the dev server with hot reload
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- `http://localhost:8000` — API root
- `http://localhost:8000/docs` — Swagger UI (interactive)
- `http://localhost:8000/redoc` — ReDoc

> **Note:** Flyway migrations must have already been applied. Run them via Docker:
> ```bash
> docker compose run --rm flyway migrate
> ```

---

## Configuration

All configuration is handled by `app/config.py` via Pydantic Settings. Values are read from environment variables (or a `.env` file).

```python
# app/config.py — key settings
class Settings(BaseSettings):
    db_host: str = "postgres"          # hostname of postgres container
    db_port: int = 5432
    db_name: str = "codereview"
    db_user: str = "codereview"
    db_password: str = "codereview"

    ai_provider: str = "disabled"      # "anthropic" | "openai" | "disabled"
    anthropic_api_key: str = ""
    ai_model: str = "claude-opus-4-6"

    encryption_key: str                # 64 hex chars → 32-byte AES key

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
```

Access settings anywhere with:

```python
from app.config import get_settings
settings = get_settings()   # cached singleton via @lru_cache
```

---

## Database

### Connection

`app/database.py` creates a synchronous SQLAlchemy engine with:
- **Connection retry** — 10 attempts, 3-second delay (handles container startup race)
- **Pool pre-ping** — validates connections before use
- **Pool size** — configurable via `DB_POOL_SIZE` (default 10)

```python
from app.database import get_db   # FastAPI dependency

@router.get("/example")
def my_endpoint(db: Session = Depends(get_db)):
    ...
```

### Schema management

All DDL is managed by **Flyway** (not SQLAlchemy `create_all`). Migration files live in `../db/migrations/`.

| Migration | Creates |
|-----------|---------|
| V1 | `repositories` |
| V2 | `commits` |
| V3 | `reviews` |
| V4 | `findings` |
| V5 | `developers`, `developer_commits` |
| V6 | `schedule_configs` |
| V7 | `tech_debt_snapshots` |
| V8 | `finding_rules` (structure) |
| V9 | Seed data — 20 detection rules |

`Base.metadata.create_all()` is called in `main.py` as a safety net only; Flyway is the authoritative migration tool.

### ORM Models

All models use `UUID` primary keys (PostgreSQL `gen_random_uuid()`), `TIMESTAMPTZ` for all timestamps, and explicit `ondelete` cascade rules.

```python
# Example: querying with a relationship pre-loaded
from app.models import Repository
repo = db.query(Repository).filter(Repository.id == repo_id).first()
schedule = repo.schedule   # lazy-loaded relationship
```

---

## API Reference

### Base URL

```
http://localhost:8000/api/v1
```

Interactive docs: `http://localhost:8000/docs`

### Endpoints

#### Repositories

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/repositories` | List all repositories |
| `POST` | `/repositories` | Add a repository (body: `RepositoryCreate`) |
| `GET` | `/repositories/{id}` | Get a repository with its schedule |
| `PUT` | `/repositories/{id}` | Update branch / token / active status |
| `DELETE` | `/repositories/{id}` | Remove repository and all related data |
| `GET` | `/repositories/{id}/commits` | List commits (latest 50) |
| `GET` | `/repositories/{id}/schedule` | Get schedule config |
| `POST` | `/repositories/{id}/schedule` | Create or update schedule config |
| `POST` | `/repositories/{id}/trigger` | Trigger an immediate review (background task) |

**Create repository — request body:**

```json
{
  "name": "spring-boot",
  "owner": "spring-projects",
  "full_name": "spring-projects/spring-boot",
  "github_url": "https://github.com/spring-projects/spring-boot",
  "branch": "main",
  "access_token": "ghp_..."
}
```

**Schedule config — request body:**

```json
{
  "cron_expression": "0 */6 * * *",
  "branch_pattern": "develop",
  "lookback_days": 7,
  "max_commits_per_run": 50,
  "is_active": true
}
```

#### Reviews

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/reviews` | List reviews (supports `?repository_id=`, `?status=`, `?limit=`, `?offset=`) |
| `GET` | `/reviews/{id}` | Get a single review |
| `GET` | `/reviews/{id}/findings` | Findings for a review (supports `?category=`, `?severity=`) |

#### Findings

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/findings` | List findings (supports `?category=`, `?severity=`, `?repository_id=`, `?limit=`) |
| `PATCH` | `/findings/{id}/false-positive` | Mark a finding as false positive |
| `PATCH` | `/findings/{id}/resolve` | Mark a finding as resolved |

**Category values:** `SECURITY` `TECH_DEBT` `CODE_QUALITY` `DEPENDENCY` `STYLE`

**Severity values:** `CRITICAL` `HIGH` `MEDIUM` `LOW` `INFO`

#### Developers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/developers` | List developers ordered by commit count |
| `GET` | `/developers/{login}` | Get developer by GitHub login |

#### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard/summary` | KPI aggregates (counts, scores) |
| `GET` | `/dashboard/trends?days=30` | Per-day severity counts for the last N days |

#### System

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/v1/scheduler/status` | APScheduler job list |

---

## Analysis Engine

`app/services/analysis_engine.py` — the central orchestrator. Called by the scheduler and the `/trigger` endpoint.

### Flow

```
AnalysisEngine.process_repository(repo_id)
    │
    ├── Load Repository + ScheduleConfig from DB
    ├── Decrypt GitHub token (crypto_service)
    ├── GitHubService.get_commits_since(branch, since, max_commits)
    │
    └── For each commit:
        ├── Upsert Commit record
        ├── Upsert Developer record + risk score update
        ├── Create Review (status=RUNNING)
        │
        ├── For each Java diff file:
        │   ├── SecurityAnalyzer.analyze_diff(patch, filename)
        │   └── TechDebtAnalyzer.analyze_diff(patch, filename)
        │
        ├── AIReviewer.review_diff(combined_diff, repo_name)
        │
        ├── Persist all Findings
        ├── Calculate overall_score = (pattern_score + ai_score) / 2
        └── Update Review.status = COMPLETED
```

### Developer Risk Score

```
risk_score = (critical × 10 + high × 5) / max(total_commits, 1)
             capped at 100
```

| Range | Level |
|-------|-------|
| 0–10 | LOW |
| 10–25 | MEDIUM |
| 25–50 | HIGH |
| 50+ | CRITICAL |

---

## Scheduler

`app/scheduler/scheduler.py` wraps APScheduler's `BackgroundScheduler`.

### Lifecycle

1. **Startup** (`main.py` lifespan) — loads all active `ScheduleConfig` rows from DB, registers a cron job per repository
2. **Runtime** — each job calls `_run_review(repository_id)` which opens its own DB session
3. **Dynamic update** — when a schedule is saved via `POST /repositories/{id}/schedule`, `register_dynamic_schedule()` replaces the job immediately
4. **Shutdown** — graceful scheduler stop on application exit

### Adding a one-off job programmatically

```python
from app.scheduler.scheduler import get_scheduler
from datetime import datetime, timezone, timedelta

scheduler = get_scheduler()
scheduler.add_job(
    my_function,
    'date',
    run_date=datetime.now(timezone.utc) + timedelta(seconds=30),
    args=[my_arg],
    id='my_unique_job_id',
)
```

---

## Security Analyzer

`app/services/security_analyzer.py`

Scans only **added lines** (`+` prefix in git diff) to avoid false positives on unchanged context.

| Rule ID | Severity | Pattern | CWE |
|---------|----------|---------|-----|
| SEC001 | CRITICAL | SQL string concatenation in `executeQuery` | CWE-89 |
| SEC002 | CRITICAL | Hardcoded `password=`, `secret=`, `api_key=` literals | CWE-798 |
| SEC003 | HIGH | `response.getWriter().print(request.` | CWE-79 |
| SEC004 | HIGH | `ObjectInputStream`, `readObject()` | CWE-502 |
| SEC005 | HIGH | Sensitive field names inside `log.*()` calls | CWE-532 |
| SEC006 | MEDIUM | `getInstance("MD5")`, `DESKeySpec`, `RC4` | CWE-327 |
| SEC007 | MEDIUM | `getParameter(` without `@Valid` nearby | CWE-20 |
| SEC008 | HIGH | `new File(request.` / user-controlled path | CWE-22 |

### Extending with a new security rule

```python
# In security_analyzer.py — add to SECURITY_PATTERNS list:
{
    "rule_id": "SEC009",
    "severity": "HIGH",
    "pattern": re.compile(r'Runtime\.getRuntime\(\)\.exec\s*\(', re.IGNORECASE),
    "title": "OS Command Injection Risk",
    "cwe_id": "CWE-78",
    "recommendation": "Use ProcessBuilder with an explicit argument array; never pass user input to shell commands",
},
```

---

## Tech Debt Analyzer

`app/services/techdebt_analyzer.py`

| Rule ID | Severity | Detects | Estimated Fix (min) |
|---------|----------|---------|---------------------|
| TD001 | HIGH | `@Deprecated`, `sun.*` usage | 120 |
| TD002 | MEDIUM | `// TODO`, `// FIXME`, `// HACK` | 30 |
| TD003 | MEDIUM | `catch (Exception` broad handler | 60 |
| TD004 | MEDIUM | Empty `catch` block `catch (...) {}` | 60 |
| TD005 | HIGH | `System.out.print` / `System.err.print` | 15 |
| TD006 | LOW | Method body > 2000 chars (complexity heuristic) | 180 |

---

## AI Reviewer

`app/services/ai_reviewer.py`

When `AI_PROVIDER` is set to `anthropic` or `openai`, the engine sends the first 8 000 characters of the combined Java diff to the LLM with a structured prompt requesting JSON output.

```
{
  "overall_score": <0–100>,
  "summary": "<1-2 sentence summary>",
  "findings": [
    { "category", "severity", "title", "file_path", "line_hint", "description", "recommendation" }
  ]
}
```

If the AI provider is `disabled` or the API call fails, the reviewer returns a fallback response with a neutral score and no findings — the pattern-based analyzers always run regardless.

### Configuring the AI provider

```bash
# .env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
AI_MODEL=claude-opus-4-6     # or claude-sonnet-4-6 for faster/cheaper reviews
```

---

## Adding a New Analyzer

1. Create `app/services/my_analyzer.py` with an `analyze_diff(patch, file_path) -> List[dict]` method
2. Each returned dict should have keys: `rule_id`, `category`, `severity`, `title`, `file_path`, `line_start`, `code_snippet`, `description`, `recommendation`
3. Import and call it in `analysis_engine.py` inside `_process_commit()`:

```python
from app.services.my_analyzer import MyAnalyzer

# In __init__:
self.my_analyzer = MyAnalyzer()

# In _process_commit(), inside the diff loop:
for finding in self.my_analyzer.analyze_diff(patch, fname):
    all_findings.append(finding)
```

---

## Adding a New API Endpoint

1. Create (or edit) a file in `app/api/`
2. Define a router: `router = APIRouter(prefix="/api/v1/myresource", tags=["myresource"])`
3. Register it in `app/main.py`:

```python
from app.api import myresource
app.include_router(myresource.router)
```

4. Add the corresponding Pydantic schema in `app/schemas/`
5. Add a Playwright test in `frontend/tests/e2e/`

---

## Code Conventions

| Convention | Detail |
|------------|--------|
| **Formatting** | PEP 8; 4-space indents; 100-char line length |
| **Type hints** | All function signatures must have type hints |
| **DB sessions** | Always use `Depends(get_db)` — never create sessions in service layer directly |
| **Error handling** | Raise `HTTPException` in route handlers; services raise plain Python exceptions |
| **Timestamps** | Always use `datetime.now(timezone.utc)` — never `datetime.utcnow()` |
| **UUIDs** | All primary keys are `UUID(as_uuid=True)` — pass as `str(uuid)` when comparing |
| **Secrets** | Never log tokens or passwords; use `crypto_service` for at-rest encryption |
