# Java Code Review Automation Platform — Design Document

**Document Classification:** Internal — Architecture & Engineering Design
**Version:** 1.0
**Date:** March 29, 2026
**Prepared by:** Enterprise Architecture & Technology Office
**Audience:** Engineering Leadership, Software Architects, Senior Engineers

---

## 1. Executive Summary

The **Java Code Review Automation Platform** is a scheduled, AI-assisted application that automatically reviews Java and Spring Framework code commits from one or more GitHub repositories. It identifies security vulnerabilities, technical debt, code quality issues, and developer contribution patterns — and presents findings through an interactive React dashboard.

The platform runs entirely on a **desktop-based Docker environment**, uses **Python** for the backend services, **React** for the frontend, **PostgreSQL** for persistence, and **Flyway** for schema lifecycle management.

---

## 2. System Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        DOCKER DESKTOP ENVIRONMENT                                    │
│                                                                                     │
│  ┌────────────────┐    ┌────────────────────────────────┐    ┌───────────────────┐  │
│  │                │    │       PYTHON BACKEND            │    │   REACT FRONTEND  │  │
│  │   SCHEDULER    │    │                                │    │                   │  │
│  │   (APScheduler)│───▶│  ┌──────────┐  ┌───────────┐  │    │  ┌─────────────┐  │  │
│  │                │    │  │ GitHub   │  │  Analysis  │  │    │  │  Dashboard  │  │  │
│  │  Cron-based    │    │  │ Poller   │  │  Engine    │  │◀──▶│  │  Reports    │  │  │
│  │  per repo      │    │  │ Service  │  │  (Rules +  │  │    │  │  Config     │  │  │
│  └────────────────┘    │  └────┬─────┘  │   LLM)    │  │    │  │  Settings   │  │  │
│                        │       │        └─────┬─────┘  │    │  └─────────────┘  │  │
│  ┌────────────────┐    │       ▼              ▼        │    └──────────┬────────┘  │
│  │   POSTGRESQL   │    │  ┌─────────────────────────┐  │               │           │
│  │   DATABASE     │◀──▶│  │   Repository Layer      │  │◀──────────────┘           │
│  │                │    │  │   (SQLAlchemy + Flyway)  │  │    REST API               │
│  │  Flyway        │    │  └─────────────────────────┘  │    (FastAPI)               │
│  │  Migrations    │    └────────────────────────────────┘                           │
│  └────────────────┘                                                                 │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐    │
│  │                         EXTERNAL INTEGRATIONS                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │    │
│  │  │  GitHub API  │  │  OpenAI /    │  │  OWASP        │  │  PMD /        │  │    │
│  │  │  (REST v3)   │  │  Anthropic   │  │  Dependency   │  │  SpotBugs     │  │    │
│  │  │              │  │  Claude API  │  │  Check API    │  │  (via CLI)    │  │    │
│  │  └──────────────┘  └──────────────┘  └───────────────┘  └───────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Docker Compose Services

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  docker-compose.yml                                                             │
│                                                                                 │
│  services:                                                                      │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│    │  frontend    │   │  backend     │   │  postgres    │   │  flyway      │   │
│    │  (React)     │   │  (FastAPI)   │   │  (PgSQL 16)  │   │  (migrations)│   │
│    │  Port: 3000  │   │  Port: 8000  │   │  Port: 5432  │   │  (init-only) │   │
│    │              │   │              │   │              │   │              │   │
│    │  nginx:      │   │  python:3.12 │   │  postgres:16 │   │  flyway:10   │   │
│    │  alpine      │   │  slim        │   │  alpine      │   │  image       │   │
│    └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   │
│                                                                                 │
│  volumes: postgres_data, flyway_conf, review_cache                              │
│  networks: codereview_net (internal bridge)                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Project Structure

```
github-code-review-poc/
│
├── docker-compose.yml                  # Docker Compose orchestration
├── .env.example                        # Environment variable template
├── README.md
│
├── backend/                            # Python FastAPI application
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini                     # (Alembic for dev; Flyway for prod migrations)
│   ├── app/
│   │   ├── main.py                     # FastAPI app entrypoint
│   │   ├── config.py                   # Pydantic settings (reads .env)
│   │   ├── database.py                 # SQLAlchemy engine + session
│   │   │
│   │   ├── api/                        # REST API route handlers
│   │   │   ├── __init__.py
│   │   │   ├── repos.py                # Repository CRUD + config
│   │   │   ├── reviews.py              # Review results & reports
│   │   │   ├── developers.py           # Developer contribution analysis
│   │   │   ├── security.py             # Security findings endpoints
│   │   │   ├── techdebt.py             # Tech debt endpoints
│   │   │   └── scheduler.py            # Scheduler control endpoints
│   │   │
│   │   ├── models/                     # SQLAlchemy ORM models
│   │   │   ├── repository.py
│   │   │   ├── commit.py
│   │   │   ├── review.py
│   │   │   ├── finding.py
│   │   │   ├── developer.py
│   │   │   └── schedule_config.py
│   │   │
│   │   ├── schemas/                    # Pydantic request/response schemas
│   │   │   ├── repository.py
│   │   │   ├── review.py
│   │   │   ├── finding.py
│   │   │   └── developer.py
│   │   │
│   │   ├── services/                   # Business logic layer
│   │   │   ├── github_service.py       # GitHub API client (PyGithub)
│   │   │   ├── analysis_engine.py      # Orchestrates all analyzers
│   │   │   ├── security_analyzer.py    # Security vulnerability detection
│   │   │   ├── techdebt_analyzer.py    # Tech debt detection
│   │   │   ├── quality_analyzer.py     # Code quality metrics
│   │   │   ├── dependency_analyzer.py  # Dependency vulnerability check
│   │   │   ├── ai_reviewer.py          # LLM-based code review (Claude/OpenAI)
│   │   │   └── report_service.py       # Report generation
│   │   │
│   │   └── scheduler/
│   │       ├── scheduler.py            # APScheduler setup
│   │       └── jobs.py                 # Scheduled job definitions
│   │
├── frontend/                           # React application
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Dashboard/
│       │   ├── Repositories/
│       │   ├── Reviews/
│       │   ├── Developers/
│       │   ├── Security/
│       │   ├── TechDebt/
│       │   └── Settings/
│       ├── services/
│       │   └── api.ts                  # Axios API client
│       └── store/
│           └── index.ts                # Zustand state management
│
└── db/
    └── migrations/                     # Flyway SQL migrations
        ├── V1__create_repositories.sql
        ├── V2__create_commits.sql
        ├── V3__create_reviews.sql
        ├── V4__create_findings.sql
        ├── V5__create_developers.sql
        ├── V6__create_schedule_configs.sql
        ├── V7__create_tech_debt.sql
        ├── V8__create_security_issues.sql
        ├── V9__seed_finding_categories.sql
        └── V10__seed_default_schedule.sql
```

---

## 4. Database Design (PostgreSQL + Flyway)

### 4.1 Entity Relationship Diagram

```
┌───────────────────┐        ┌────────────────────┐        ┌─────────────────────┐
│   repositories    │        │      commits        │        │      reviews        │
│───────────────────│        │────────────────────│        │─────────────────────│
│ id (PK)           │───┐    │ id (PK)             │───┐    │ id (PK)             │
│ name              │   │    │ repository_id (FK)  │   │    │ commit_id (FK)      │
│ owner             │   └───▶│ sha                 │   └───▶│ repository_id (FK)  │
│ full_name         │        │ message             │        │ status              │
│ github_url        │        │ author_email        │        │ started_at          │
│ branch            │        │ author_name         │        │ completed_at        │
│ access_token_enc  │        │ committed_at        │        │ overall_score       │
│ is_active         │        │ files_changed       │        │ summary             │
│ created_at        │        │ additions           │        │ ai_review_text      │
│ updated_at        │        │ deletions           │        │ created_at          │
└───────────────────┘        │ review_status       │        └──────────┬──────────┘
                             │ created_at          │                   │
                             └────────┬────────────┘                   │
                                      │                                │
                                      ▼                                ▼
┌───────────────────────┐    ┌─────────────────────────────────────────────────────┐
│      developers       │    │                    findings                          │
│───────────────────────│    │─────────────────────────────────────────────────────│
│ id (PK)               │    │ id (PK)                                              │
│ github_login          │    │ review_id (FK)                                       │
│ name                  │    │ commit_id (FK)                                       │
│ email                 │    │ category (SECURITY|TECHDEBT|QUALITY|DEPENDENCY)      │
│ avatar_url            │    │ severity (CRITICAL|HIGH|MEDIUM|LOW|INFO)             │
│ total_commits         │    │ rule_id                                              │
│ total_additions       │    │ title                                                │
│ total_deletions       │    │ description                                          │
│ first_seen_at         │    │ file_path                                            │
│ last_seen_at          │    │ line_start                                           │
│ risk_score            │    │ line_end                                             │
│ created_at            │    │ code_snippet                                         │
└──────────┬────────────┘    │ recommendation                                       │
           │                 │ cwe_id (for security)                                │
           │                 │ is_false_positive                                    │
           │                 │ resolved_at                                          │
           │                 │ created_at                                           │
           │                 └──────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────┐    ┌────────────────────────────┐
│  developer_commits     │    │     schedule_configs       │
│────────────────────────│    │────────────────────────────│
│ id (PK)                │    │ id (PK)                    │
│ developer_id (FK)      │    │ repository_id (FK)         │
│ commit_id (FK)         │    │ cron_expression            │
│ repository_id (FK)     │    │ branch_pattern             │
│                        │    │ lookback_days              │
└────────────────────────┘    │ is_active                  │
                              │ last_run_at                │
                              │ next_run_at                │
                              │ created_at                 │
                              └────────────────────────────┘
```

### 4.2 Flyway Migration Scripts

**V1__create_repositories.sql**
```sql
CREATE TABLE repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255)    NOT NULL,
    owner           VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(512)    NOT NULL UNIQUE,
    github_url      TEXT            NOT NULL,
    branch          VARCHAR(255)    NOT NULL DEFAULT 'main',
    access_token_enc TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repositories_full_name ON repositories(full_name);
CREATE INDEX idx_repositories_is_active ON repositories(is_active);

COMMENT ON TABLE repositories IS 'GitHub repositories configured for automated code review';
COMMENT ON COLUMN repositories.access_token_enc IS 'AES-256 encrypted GitHub personal access token';
```

**V2__create_commits.sql**
```sql
CREATE TABLE commits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID            NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha             VARCHAR(40)     NOT NULL,
    message         TEXT,
    author_email    VARCHAR(255),
    author_name     VARCHAR(255),
    committed_at    TIMESTAMPTZ     NOT NULL,
    files_changed   INTEGER         DEFAULT 0,
    additions       INTEGER         DEFAULT 0,
    deletions       INTEGER         DEFAULT 0,
    review_status   VARCHAR(50)     NOT NULL DEFAULT 'PENDING'
                    CHECK (review_status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','SKIPPED')),
    raw_diff_path   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, sha)
);

CREATE INDEX idx_commits_repository_id ON commits(repository_id);
CREATE INDEX idx_commits_committed_at  ON commits(committed_at DESC);
CREATE INDEX idx_commits_review_status ON commits(review_status);
CREATE INDEX idx_commits_author_email  ON commits(author_email);

COMMENT ON TABLE commits IS 'Individual commits fetched from configured GitHub repositories';
```

**V3__create_reviews.sql**
```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_id       UUID            NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    repository_id   UUID            NOT NULL REFERENCES repositories(id),
    status          VARCHAR(50)     NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    duration_ms     INTEGER,
    overall_score   NUMERIC(5,2),
    security_score  NUMERIC(5,2),
    quality_score   NUMERIC(5,2),
    techdebt_score  NUMERIC(5,2),
    summary         TEXT,
    ai_review_text  TEXT,
    error_message   TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_commit_id     ON reviews(commit_id);
CREATE INDEX idx_reviews_repository_id ON reviews(repository_id);
CREATE INDEX idx_reviews_status        ON reviews(status);
CREATE INDEX idx_reviews_completed_at  ON reviews(completed_at DESC);
```

**V4__create_findings.sql**
```sql
CREATE TABLE findings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id           UUID            NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    commit_id           UUID            NOT NULL REFERENCES commits(id),
    category            VARCHAR(50)     NOT NULL
                        CHECK (category IN ('SECURITY','TECH_DEBT','CODE_QUALITY','DEPENDENCY','STYLE')),
    severity            VARCHAR(20)     NOT NULL
                        CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
    rule_id             VARCHAR(100),
    title               VARCHAR(500)    NOT NULL,
    description         TEXT,
    file_path           TEXT,
    line_start          INTEGER,
    line_end            INTEGER,
    code_snippet        TEXT,
    recommendation      TEXT,
    cwe_id              VARCHAR(20),
    owasp_category      VARCHAR(100),
    is_false_positive   BOOLEAN         NOT NULL DEFAULT FALSE,
    resolved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_review_id    ON findings(review_id);
CREATE INDEX idx_findings_commit_id    ON findings(commit_id);
CREATE INDEX idx_findings_category     ON findings(category);
CREATE INDEX idx_findings_severity     ON findings(severity);
CREATE INDEX idx_findings_resolved     ON findings(resolved_at) WHERE resolved_at IS NULL;
```

**V5__create_developers.sql**
```sql
CREATE TABLE developers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_login    VARCHAR(255)    NOT NULL UNIQUE,
    name            VARCHAR(255),
    email           VARCHAR(255),
    avatar_url      TEXT,
    total_commits   INTEGER         NOT NULL DEFAULT 0,
    total_additions INTEGER         NOT NULL DEFAULT 0,
    total_deletions INTEGER         NOT NULL DEFAULT 0,
    critical_findings_count INTEGER NOT NULL DEFAULT 0,
    high_findings_count     INTEGER NOT NULL DEFAULT 0,
    risk_score      NUMERIC(5,2)    DEFAULT 0.0,
    first_seen_at   TIMESTAMPTZ,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE developer_commits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id    UUID            NOT NULL REFERENCES developers(id),
    commit_id       UUID            NOT NULL REFERENCES commits(id),
    repository_id   UUID            NOT NULL REFERENCES repositories(id),
    UNIQUE(developer_id, commit_id)
);

CREATE INDEX idx_developer_commits_dev  ON developer_commits(developer_id);
CREATE INDEX idx_developer_commits_repo ON developer_commits(repository_id);
```

**V6__create_schedule_configs.sql**
```sql
CREATE TABLE schedule_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id       UUID            NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    cron_expression     VARCHAR(100)    NOT NULL DEFAULT '0 */6 * * *',
    branch_pattern      VARCHAR(255)    NOT NULL DEFAULT 'develop',
    lookback_days       INTEGER         NOT NULL DEFAULT 7,
    max_commits_per_run INTEGER         NOT NULL DEFAULT 50,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    last_run_at         TIMESTAMPTZ,
    next_run_at         TIMESTAMPTZ,
    last_run_status     VARCHAR(50),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id)
);
```

**V7__create_tech_debt.sql**
```sql
CREATE TABLE tech_debt_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id   UUID            NOT NULL REFERENCES repositories(id),
    snapshot_date   DATE            NOT NULL,
    total_issues    INTEGER         NOT NULL DEFAULT 0,
    critical_count  INTEGER         NOT NULL DEFAULT 0,
    high_count      INTEGER         NOT NULL DEFAULT 0,
    medium_count    INTEGER         NOT NULL DEFAULT 0,
    low_count       INTEGER         NOT NULL DEFAULT 0,
    debt_minutes    INTEGER         NOT NULL DEFAULT 0,
    debt_ratio      NUMERIC(5,2),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE(repository_id, snapshot_date)
);

CREATE INDEX idx_debt_snapshots_repo_date ON tech_debt_snapshots(repository_id, snapshot_date DESC);
```

**V9__seed_finding_categories.sql**
```sql
CREATE TABLE finding_rules (
    id              VARCHAR(100)    PRIMARY KEY,
    category        VARCHAR(50)     NOT NULL,
    severity        VARCHAR(20)     NOT NULL,
    title           VARCHAR(500)    NOT NULL,
    description     TEXT,
    cwe_id          VARCHAR(20),
    recommendation  TEXT
);

INSERT INTO finding_rules (id, category, severity, title, cwe_id) VALUES
    ('SEC001', 'SECURITY', 'CRITICAL', 'SQL Injection vulnerability detected', 'CWE-89'),
    ('SEC002', 'SECURITY', 'CRITICAL', 'Hardcoded credentials in source code', 'CWE-798'),
    ('SEC003', 'SECURITY', 'HIGH',     'XSS vulnerability - unescaped output', 'CWE-79'),
    ('SEC004', 'SECURITY', 'HIGH',     'Insecure deserialization', 'CWE-502'),
    ('SEC005', 'SECURITY', 'HIGH',     'Sensitive data exposure in logs', 'CWE-532'),
    ('SEC006', 'SECURITY', 'MEDIUM',   'Weak cryptographic algorithm usage', 'CWE-327'),
    ('SEC007', 'SECURITY', 'MEDIUM',   'Missing input validation', 'CWE-20'),
    ('SEC008', 'SECURITY', 'HIGH',     'Path traversal vulnerability', 'CWE-22'),
    ('TD001',  'TECH_DEBT','HIGH',     'Deprecated API usage detected', NULL),
    ('TD002',  'TECH_DEBT','MEDIUM',   'TODO/FIXME/HACK comment detected', NULL),
    ('TD003',  'TECH_DEBT','MEDIUM',   'Overly complex method (cyclomatic complexity > 10)', NULL),
    ('TD004',  'TECH_DEBT','LOW',      'Duplicate code block detected', NULL),
    ('TD005',  'TECH_DEBT','HIGH',     'Missing unit tests for changed methods', NULL),
    ('TD006',  'TECH_DEBT','MEDIUM',   'Dead code / unreachable code detected', NULL),
    ('QA001',  'CODE_QUALITY','MEDIUM','Null pointer dereference risk', 'CWE-476'),
    ('QA002',  'CODE_QUALITY','LOW',   'Missing Javadoc on public API', NULL),
    ('QA003',  'CODE_QUALITY','MEDIUM','Exception swallowed without handling', NULL),
    ('QA004',  'CODE_QUALITY','HIGH',  'Thread safety issue detected', 'CWE-362'),
    ('DEP001', 'DEPENDENCY','CRITICAL','Known CVE in dependency', NULL),
    ('DEP002', 'DEPENDENCY','HIGH',    'Outdated dependency with known vulnerabilities', NULL);
```

---

## 5. Backend Design (Python / FastAPI)

### 5.1 Configuration (config.py)

```python
# backend/app/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    db_host: str = "postgres"
    db_port: int = 5432
    db_name: str = "codereview"
    db_user: str = "codereview"
    db_password: str
    db_pool_size: int = 10

    # GitHub
    github_api_url: str = "https://api.github.com"
    default_github_token: str = ""

    # AI Review
    ai_provider: str = "anthropic"          # anthropic | openai | disabled
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ai_model: str = "claude-opus-4-6"

    # Encryption
    encryption_key: str                     # AES-256 key for token storage

    # Scheduler
    scheduler_timezone: str = "UTC"

    @property
    def database_url(self) -> str:
        return (f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
                f"@{self.db_host}:{self.db_port}/{self.db_name}")

    class Config:
        env_file = ".env"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### 5.2 GitHub Service (github_service.py)

```python
# backend/app/services/github_service.py
from github import Github, GithubException
from datetime import datetime, timedelta
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

class GitHubService:
    """
    Wraps PyGithub to fetch commits and diffs from configured repositories.
    Supports multiple repos, each with their own access token.
    """

    def __init__(self, token: str):
        self.client = Github(token, per_page=100)

    def get_commits_since(
        self,
        repo_full_name: str,
        branch: str,
        since: datetime,
        max_commits: int = 50
    ) -> List[dict]:
        """
        Fetch commits from a branch since a given datetime.
        Returns list of commit metadata dicts.
        """
        try:
            repo = self.client.get_repo(repo_full_name)
            commits = repo.get_commits(
                sha=branch,
                since=since,
                until=datetime.utcnow()
            )

            result = []
            for commit in commits[:max_commits]:
                files = commit.files or []
                java_files = [f for f in files if f.filename.endswith('.java')]

                result.append({
                    "sha": commit.sha,
                    "message": commit.commit.message,
                    "author_name": commit.commit.author.name,
                    "author_email": commit.commit.author.email,
                    "committed_at": commit.commit.author.date,
                    "files_changed": len(files),
                    "java_files_changed": len(java_files),
                    "additions": commit.stats.additions,
                    "deletions": commit.stats.deletions,
                    "java_diffs": [
                        {
                            "filename": f.filename,
                            "patch": f.patch or "",
                            "additions": f.additions,
                            "deletions": f.deletions,
                            "status": f.status
                        }
                        for f in java_files if f.patch
                    ]
                })
            return result

        except GithubException as e:
            logger.error(f"GitHub API error for {repo_full_name}: {e}")
            raise

    def get_repository_info(self, repo_full_name: str) -> dict:
        repo = self.client.get_repo(repo_full_name)
        return {
            "name": repo.name,
            "owner": repo.owner.login,
            "full_name": repo.full_name,
            "default_branch": repo.default_branch,
            "language": repo.language,
            "stargazers_count": repo.stargazers_count,
            "open_issues_count": repo.open_issues_count,
        }
```

### 5.3 Security Analyzer (security_analyzer.py)

```python
# backend/app/services/security_analyzer.py
import re
from dataclasses import dataclass
from typing import List

@dataclass
class SecurityFinding:
    rule_id: str
    severity: str
    title: str
    file_path: str
    line_number: int
    code_snippet: str
    description: str
    recommendation: str
    cwe_id: str

# Pattern-based detection rules
SECURITY_PATTERNS = [
    {
        "rule_id": "SEC001",
        "severity": "CRITICAL",
        "pattern": re.compile(
            r'(Statement|PreparedStatement).*\+\s*(request|param|input|user)',
            re.IGNORECASE
        ),
        "title": "Potential SQL Injection",
        "cwe_id": "CWE-89",
        "recommendation": "Use parameterized queries or JPA/Spring Data abstractions"
    },
    {
        "rule_id": "SEC002",
        "severity": "CRITICAL",
        "pattern": re.compile(
            r'(password|passwd|secret|api_key|apikey|token)\s*=\s*["\'][^"\']{4,}["\']',
            re.IGNORECASE
        ),
        "title": "Hardcoded Credential Detected",
        "cwe_id": "CWE-798",
        "recommendation": "Use environment variables or a secrets manager (Vault, AWS Secrets Manager)"
    },
    {
        "rule_id": "SEC003",
        "severity": "HIGH",
        "pattern": re.compile(
            r'(response\.getWriter|PrintWriter).*\.(print|write)\s*\(\s*(request\.|param)',
            re.IGNORECASE
        ),
        "title": "Potential XSS - Unescaped Output",
        "cwe_id": "CWE-79",
        "recommendation": "Escape all user-controlled data before writing to HTTP response"
    },
    {
        "rule_id": "SEC004",
        "severity": "HIGH",
        "pattern": re.compile(
            r'ObjectInputStream|readObject\(\)|XMLDecoder',
            re.IGNORECASE
        ),
        "title": "Insecure Deserialization",
        "cwe_id": "CWE-502",
        "recommendation": "Avoid Java serialization; use JSON/protobuf with schema validation"
    },
    {
        "rule_id": "SEC005",
        "severity": "HIGH",
        "pattern": re.compile(
            r'(log\.|logger\.|LOG\.).*\b(password|token|secret|credential|ssn|credit)',
            re.IGNORECASE
        ),
        "title": "Sensitive Data in Log Statement",
        "cwe_id": "CWE-532",
        "recommendation": "Redact or mask sensitive fields before logging"
    },
    {
        "rule_id": "SEC006",
        "severity": "MEDIUM",
        "pattern": re.compile(
            r'(MD5|SHA1|DES|RC4|getInstance\("MD5"\)|getInstance\("SHA-1"\))',
            re.IGNORECASE
        ),
        "title": "Weak Cryptographic Algorithm",
        "cwe_id": "CWE-327",
        "recommendation": "Use SHA-256+, AES-256-GCM, or BCrypt for hashing passwords"
    },
    {
        "rule_id": "SEC008",
        "severity": "HIGH",
        "pattern": re.compile(
            r'new\s+File\s*\(\s*(request\.|param|input)',
            re.IGNORECASE
        ),
        "title": "Path Traversal Vulnerability",
        "cwe_id": "CWE-22",
        "recommendation": "Validate and canonicalize file paths; use allowlists for permitted directories"
    },
]

class SecurityAnalyzer:
    def analyze_diff(self, diff_patch: str, file_path: str) -> List[SecurityFinding]:
        findings = []
        lines = diff_patch.split('\n')

        for line_idx, line in enumerate(lines):
            if not line.startswith('+'):
                continue  # Only analyze added lines

            code_line = line[1:]  # Remove the '+' prefix
            for rule in SECURITY_PATTERNS:
                if rule["pattern"].search(code_line):
                    findings.append(SecurityFinding(
                        rule_id=rule["rule_id"],
                        severity=rule["severity"],
                        title=rule["title"],
                        file_path=file_path,
                        line_number=line_idx + 1,
                        code_snippet=code_line.strip(),
                        description=f"{rule['title']} detected in {file_path}",
                        recommendation=rule["recommendation"],
                        cwe_id=rule["cwe_id"]
                    ))
        return findings
```

### 5.4 Tech Debt Analyzer (techdebt_analyzer.py)

```python
# backend/app/services/techdebt_analyzer.py
import re
from typing import List

TECH_DEBT_PATTERNS = [
    {
        "rule_id": "TD002",
        "severity": "MEDIUM",
        "pattern": re.compile(r'//\s*(TODO|FIXME|HACK|XXX|BUG)\b', re.IGNORECASE),
        "title": "Technical Debt Marker Comment",
        "estimate_minutes": 30
    },
    {
        "rule_id": "TD001",
        "severity": "HIGH",
        "pattern": re.compile(
            r'@Deprecated|\.deprecated\b|sun\.\w+\.\w+',
            re.IGNORECASE
        ),
        "title": "Deprecated API Usage",
        "estimate_minutes": 120
    },
    {
        "rule_id": "TD006",
        "severity": "MEDIUM",
        "pattern": re.compile(r'catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*(//[^\n]*)?\s*\}'),
        "title": "Empty or Catch-All Exception Handler",
        "estimate_minutes": 60
    },
    {
        "rule_id": "TD003",
        "severity": "MEDIUM",
        "pattern": re.compile(
            r'(if|else if).*\{[^}]{500,}\}',  # crude complexity heuristic
            re.DOTALL
        ),
        "title": "Overly Complex Method (Complexity Heuristic)",
        "estimate_minutes": 180
    },
]

class TechDebtAnalyzer:
    def analyze_diff(self, diff_patch: str, file_path: str) -> List[dict]:
        findings = []
        lines = diff_patch.split('\n')
        for line_idx, line in enumerate(lines):
            if not line.startswith('+'):
                continue
            code_line = line[1:]
            for rule in TECH_DEBT_PATTERNS:
                if rule["pattern"].search(code_line):
                    findings.append({
                        "rule_id": rule["rule_id"],
                        "category": "TECH_DEBT",
                        "severity": rule["severity"],
                        "title": rule["title"],
                        "file_path": file_path,
                        "line_number": line_idx + 1,
                        "code_snippet": code_line.strip(),
                        "estimate_minutes": rule["estimate_minutes"]
                    })
        return findings
```

### 5.5 AI Reviewer (ai_reviewer.py)

```python
# backend/app/services/ai_reviewer.py
import anthropic
from typing import List

AI_REVIEW_PROMPT = """
You are a senior Java/Spring Framework architect performing a code review.
Analyze the following git diff from a Java/Spring application and provide:

1. **Security Issues** — SQL injection, hardcoded secrets, XSS, insecure deserialization,
   sensitive data exposure, use of weak crypto, path traversal.

2. **Technical Debt** — Use of deprecated APIs, TODO/FIXME markers, missing tests,
   overly complex methods, copy-paste code, dead code.

3. **Code Quality** — Null pointer risks, improper exception handling, thread safety
   issues, missing validation, poor naming.

4. **Spring-specific Issues** — Improper use of @Transactional, circular dependencies,
   missing @Valid annotations, N+1 query patterns in repositories.

5. **Overall Assessment** — Score from 0–100 (100 = excellent).

Format your response as structured JSON:
{
  "overall_score": <int>,
  "summary": "<1-2 sentence summary>",
  "findings": [
    {
      "category": "SECURITY|TECH_DEBT|CODE_QUALITY",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "title": "<short title>",
      "file_path": "<file>",
      "line_hint": <int or null>,
      "description": "<detailed description>",
      "recommendation": "<actionable fix>"
    }
  ]
}

Git Diff:
{diff}
"""

class AIReviewer:
    def __init__(self, api_key: str, model: str = "claude-opus-4-6"):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    async def review_diff(self, diff_content: str, repo_name: str) -> dict:
        prompt = AI_REVIEW_PROMPT.format(diff=diff_content[:15000])  # Token limit guard

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text
        # Parse JSON from LLM response
        import json, re
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return {"overall_score": 50, "summary": "AI review parsing error", "findings": []}
```

### 5.6 Scheduler (scheduler.py)

```python
# backend/app/scheduler/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.analysis_engine import AnalysisEngine

scheduler = AsyncIOScheduler(timezone="UTC")

async def run_review_job(repository_id: str, db: AsyncSession):
    """
    Scheduled job: fetch new commits for a repository and run analysis.
    """
    engine = AnalysisEngine(db)
    await engine.process_repository(repository_id)

async def load_schedules_from_db(db: AsyncSession):
    """
    On startup, load all active schedule configs from DB and register jobs.
    """
    configs = await db.execute(
        "SELECT sc.*, r.full_name FROM schedule_configs sc "
        "JOIN repositories r ON r.id = sc.repository_id "
        "WHERE sc.is_active = TRUE"
    )
    for config in configs:
        scheduler.add_job(
            run_review_job,
            CronTrigger.from_crontab(config.cron_expression),
            args=[config.repository_id],
            id=f"review_{config.repository_id}",
            replace_existing=True,
            misfire_grace_time=3600
        )

def register_dynamic_schedule(repository_id: str, cron_expression: str):
    """Called via API when a schedule is created/updated."""
    scheduler.add_job(
        run_review_job,
        CronTrigger.from_crontab(cron_expression),
        args=[repository_id],
        id=f"review_{repository_id}",
        replace_existing=True
    )
```

### 5.7 REST API Endpoints

```
GET    /api/v1/repositories                   # List all configured repos
POST   /api/v1/repositories                   # Add new repository
PUT    /api/v1/repositories/{id}              # Update repo config
DELETE /api/v1/repositories/{id}              # Remove repo

GET    /api/v1/repositories/{id}/commits      # List commits for repo
GET    /api/v1/repositories/{id}/schedule     # Get schedule config
POST   /api/v1/repositories/{id}/schedule     # Create/update schedule
POST   /api/v1/repositories/{id}/trigger      # Manual review trigger

GET    /api/v1/reviews                        # List all reviews (paginated)
GET    /api/v1/reviews/{id}                   # Get review detail
GET    /api/v1/reviews/{id}/findings          # Get findings for a review

GET    /api/v1/findings                       # All findings (filterable)
PATCH  /api/v1/findings/{id}/false-positive   # Mark as false positive
PATCH  /api/v1/findings/{id}/resolve          # Mark as resolved

GET    /api/v1/developers                     # Developer leaderboard
GET    /api/v1/developers/{login}             # Developer profile
GET    /api/v1/developers/{login}/commits     # Developer commit history

GET    /api/v1/dashboard/summary              # Aggregated dashboard metrics
GET    /api/v1/dashboard/trends               # Historical trend data
GET    /api/v1/dashboard/security-heatmap     # Security findings by file/author
```

---

## 6. Frontend Design (React + TypeScript)

### 6.1 Technology Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tooling |
| React Router | 6.x | Client-side routing |
| TanStack Query | 5.x | Server state management, caching |
| Zustand | 4.x | Client state management |
| Recharts | 2.x | Charts and data visualizations |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | Latest | Component library (accessible) |
| Axios | 1.x | HTTP client |
| React Hook Form | 7.x | Form management |
| date-fns | 3.x | Date formatting |

### 6.2 Page & Component Structure

```
src/
├── pages/
│   ├── Dashboard.tsx           # Overview with KPI cards and trend charts
│   ├── Repositories.tsx        # Repository list and add/configure repos
│   ├── RepositoryDetail.tsx    # Single repo: commits, schedule, findings
│   ├── Reviews.tsx             # All review history with filters
│   ├── ReviewDetail.tsx        # Single review: findings grouped by category
│   ├── Developers.tsx          # Developer leaderboard and risk scores
│   ├── DeveloperProfile.tsx    # Individual developer: commit history, findings
│   ├── SecurityFindings.tsx    # Security-specific view with CWE mapping
│   ├── TechDebt.tsx            # Tech debt trends and heatmaps
│   └── Settings.tsx            # App config: DB, AI provider, notifications
│
└── components/
    ├── layout/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   └── PageWrapper.tsx
    │
    ├── dashboard/
    │   ├── KPICard.tsx             # Metric card (total findings, score, etc.)
    │   ├── FindingsTrendChart.tsx  # Line chart: findings over time
    │   ├── SeverityDonut.tsx       # Donut: CRITICAL/HIGH/MEDIUM/LOW breakdown
    │   ├── TopContributors.tsx     # Bar: commits by developer
    │   ├── SecurityHeatmap.tsx     # Grid heatmap: files vs severity
    │   └── RecentReviews.tsx       # Table: last 10 reviews
    │
    ├── repository/
    │   ├── RepoCard.tsx
    │   ├── AddRepoModal.tsx
    │   ├── ScheduleConfig.tsx
    │   └── BranchSelector.tsx
    │
    ├── review/
    │   ├── ReviewStatusBadge.tsx
    │   ├── FindingsList.tsx
    │   ├── FindingCard.tsx
    │   ├── AIReviewPanel.tsx
    │   └── CodeSnippet.tsx         # Syntax-highlighted code viewer
    │
    ├── developer/
    │   ├── DeveloperCard.tsx
    │   ├── RiskScoreBadge.tsx
    │   ├── ContributionChart.tsx
    │   └── FindingsByDeveloper.tsx
    │
    └── shared/
        ├── SeverityBadge.tsx
        ├── CategoryIcon.tsx
        ├── PaginatedTable.tsx
        ├── FilterBar.tsx
        └── LoadingSpinner.tsx
```

### 6.3 Dashboard Layout (ASCII Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HEADER: Java Code Review Platform               [Last sync: 5 min ago] [⚙ ]   │
├──────────┬──────────────────────────────────────────────────────────────────────┤
│          │                                                                      │
│  SIDEBAR │   KPI CARDS ROW                                                      │
│          │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│ Dashboard│   │  CRITICAL    │ │  Total       │ │  Repos       │ │  Avg Code  │ │
│          │   │  Findings    │ │  Commits     │ │  Monitored   │ │  Score     │ │
│ Repos    │   │    12 ▲3     │ │  247         │ │    5         │ │  72/100    │ │
│          │   └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│ Reviews  │                                                                      │
│          │   ┌──────────────────────────────────────┐ ┌───────────────────────┐ │
│ Developers   │  Findings Trend (30 days)            │ │  Severity Breakdown   │ │
│          │   │                                      │ │                       │ │
│ Security │   │  ╭──────────────────────────────╮   │ │    ●  CRITICAL  12    │ │
│          │   │  │  Line chart: Critical (red)  │   │ │    ●  HIGH     34    │ │
│Tech Debt │   │  │             High (orange)    │   │ │    ●  MEDIUM   67    │ │
│          │   │  │             Medium (yellow)  │   │ │    ●  LOW      45    │ │
│ Settings │   │  ╰──────────────────────────────╯   │ │                       │ │
│          │   └──────────────────────────────────────┘ └───────────────────────┘ │
│          │                                                                      │
│          │   ┌──────────────────────────────────────┐ ┌───────────────────────┐ │
│          │   │  Top Developers by Findings          │ │  Recent Reviews       │ │
│          │   │  ┌────────┬───────┬──────┬────────┐  │ │                       │ │
│          │   │  │ Dev    │Commits│Score │ Risk   │  │ │  commit abc123  ✓     │ │
│          │   │  │ alice  │  23   │ 85   │  LOW   │  │ │  commit def456  ✗     │ │
│          │   │  │ bob    │  18   │ 62   │ MEDIUM │  │ │  commit ghi789  ⏳    │ │
│          │   │  │ charlie│  11   │ 44   │  HIGH  │  │ │  commit jkl012  ✓     │ │
│          │   │  └────────┴───────┴──────┴────────┘  │ │                       │ │
│          │   └──────────────────────────────────────┘ └───────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────────────────┘
```

### 6.4 Review Detail Page (ASCII Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Review: commit abc1234  │  repo: org/my-spring-app  │  Score: 68/100  ● HIGH  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  AI REVIEW SUMMARY                                                       │   │
│  │  "This commit introduces a potential SQL injection in UserRepository.java │   │
│  │   and contains hardcoded credentials. Additionally, 3 deprecated Spring   │   │
│  │   Security APIs are used that should be migrated to Spring Security 6."  │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  FINDINGS  [SECURITY 3] [TECH DEBT 5] [CODE QUALITY 2]  🔍 Filter  📥 Export   │
│                                                                                 │
│  ▼ SECURITY (3 findings)                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ ● CRITICAL │ SEC001 │ SQL Injection Vulnerability                        │   │
│  │ File: src/main/java/com/app/repo/UserRepository.java : 47               │   │
│  │ Code: Statement stmt = conn.executeQuery("SELECT * FROM users WHERE id=" │   │
│  │       + userId);                                                         │   │
│  │ Fix:  Use @Query with parameterized binding or Spring Data JPA methods   │   │
│  │                                         [Mark False Positive] [Resolved] │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ ● CRITICAL │ SEC002 │ Hardcoded Password Detected                       │   │
│  │ File: src/main/resources/application.properties : 12                    │   │
│  │ Code: spring.datasource.password=Passw0rd123!                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ▼ TECH DEBT (5 findings)  ...                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.9'

services:

  postgres:
    image: postgres:16-alpine
    container_name: codereview_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME:-codereview}
      POSTGRES_USER: ${DB_USER:-codereview}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-codereview}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - codereview_net

  flyway:
    image: flyway/flyway:10
    container_name: codereview_flyway
    command: -url=jdbc:postgresql://postgres:5432/${DB_NAME:-codereview}
             -user=${DB_USER:-codereview}
             -password=${DB_PASSWORD}
             -connectRetries=10
             migrate
    volumes:
      - ./db/migrations:/flyway/sql
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - codereview_net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: codereview_backend
    restart: unless-stopped
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-codereview}
      DB_USER: ${DB_USER:-codereview}
      DB_PASSWORD: ${DB_PASSWORD}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      AI_PROVIDER: ${AI_PROVIDER:-anthropic}
      AI_MODEL: ${AI_MODEL:-claude-opus-4-6}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      SCHEDULER_TIMEZONE: ${SCHEDULER_TIMEZONE:-UTC}
    ports:
      - "8000:8000"
    depends_on:
      flyway:
        condition: service_completed_successfully
    volumes:
      - review_cache:/app/cache
    networks:
      - codereview_net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: codereview_frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      VITE_API_BASE_URL: http://localhost:8000
    networks:
      - codereview_net

volumes:
  postgres_data:
    driver: local
  review_cache:
    driver: local

networks:
  codereview_net:
    driver: bridge
```

---

## 8. Analysis Engine — Orchestration Design

```
                      AnalysisEngine.process_repository(repo_id)
                                          │
                                          ▼
                          ┌──────────────────────────────┐
                          │  1. Load repo config from DB  │
                          │  2. Decrypt GitHub token      │
                          │  3. Determine lookback window │
                          └──────────────┬───────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────────┐
                          │  GitHubService.get_commits_  │
                          │  since(branch, since_date)   │
                          └──────────────┬───────────────┘
                                         │  List[CommitData]
                                         ▼
                          ┌──────────────────────────────┐
                          │  For each commit:             │
                          │  - Upsert commit record       │
                          │  - Upsert developer record    │
                          │  - Create Review record       │
                          └──────────────┬───────────────┘
                                         │
                         ┌───────────────┼────────────────┐
                         ▼               ▼                ▼
              ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
              │  Security   │   │  TechDebt   │   │     AI      │
              │  Analyzer   │   │  Analyzer   │   │  Reviewer   │
              │  (Patterns) │   │  (Patterns) │   │  (Claude)   │
              └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
                     │                 │                  │
                     └────────┬────────┘                  │
                              ▼                           │
                   ┌─────────────────────┐                │
                   │  Persist Findings   │◀───────────────┘
                   │  to DB              │
                   └─────────┬───────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │  Update Review:     │
                   │  - Calculate scores │
                   │  - Update status    │
                   │  - Update developer │
                   │    risk_score       │
                   └─────────┬───────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │  Update Schedule:   │
                   │  last_run_at = NOW()│
                   │  next_run_at = calc │
                   └─────────────────────┘
```

### 8.1 Developer Risk Score Algorithm

```
risk_score = (
    (critical_findings × 10.0) +
    (high_findings    ×  5.0) +
    (medium_findings  ×  2.0) +
    (low_findings     ×  0.5)
) / max(total_commits, 1)

Capped at 100. Normalized across all developers.

Risk Level:
  0 – 10:   LOW     (Green)
  10 – 25:  MEDIUM  (Yellow)
  25 – 50:  HIGH    (Orange)
  50+:      CRITICAL (Red)
```

---

## 9. Security & Configuration Design

### 9.1 Secrets Management

| Secret | Storage Strategy |
|--------|----------------|
| GitHub PAT (per repo) | AES-256 encrypted in `repositories.access_token_enc`; decrypted at runtime using `ENCRYPTION_KEY` env var |
| Database password | Docker environment variable; never stored in code |
| AI API keys | Docker environment variable; passed to container at runtime |
| `ENCRYPTION_KEY` | Generated once per installation; stored in `.env` (not committed to git) |

### 9.2 Environment File Template (.env.example)

```bash
# Database
DB_NAME=codereview
DB_USER=codereview
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# Encryption (generate with: python -c "import secrets; print(secrets.token_hex(32))")
ENCRYPTION_KEY=CHANGE_ME_64_HEX_CHARS

# AI Provider (anthropic | openai | disabled)
AI_PROVIDER=anthropic
AI_MODEL=claude-opus-4-6
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Scheduler
SCHEDULER_TIMEZONE=UTC
```

---

## 10. Non-Functional Requirements

| Requirement | Target | Design Decision |
|-------------|--------|----------------|
| **Review Latency** | < 3 minutes per commit (without AI) | Parallel analyzer execution via `asyncio.gather` |
| **Review Latency (AI)** | < 5 minutes per commit | AI review runs asynchronously; results appended post-pattern analysis |
| **Data Retention** | Configurable (default 90 days) | PostgreSQL partitioning on `committed_at`; scheduled cleanup job |
| **Concurrent Repos** | Up to 20 repos | APScheduler handles concurrent jobs; connection pooling for DB |
| **Dashboard Load Time** | < 2 seconds | TanStack Query caching; paginated API responses; indexed DB queries |
| **Availability** | Docker restart: `unless-stopped` | Auto-restart on crash; health checks on all services |

---

## 11. Implementation Phases

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1: Foundation** | Week 1–2 | Docker Compose, Flyway migrations V1–V6, FastAPI skeleton, DB models, basic health check |
| **Phase 2: GitHub Integration** | Week 3 | GitHubService, commit fetching, repo CRUD API, schedule config API |
| **Phase 3: Analysis Engine** | Week 4–5 | SecurityAnalyzer, TechDebtAnalyzer, AnalysisEngine orchestration, finding persistence |
| **Phase 4: Scheduler** | Week 6 | APScheduler integration, cron-based job execution, manual trigger API |
| **Phase 5: AI Reviewer** | Week 7 | Claude/OpenAI integration, AI findings merging, score calculation |
| **Phase 6: Frontend — Core** | Week 8–9 | Dashboard, Repositories page, Review detail page |
| **Phase 7: Frontend — Analytics** | Week 10–11 | Developer profiles, Security findings, Tech debt trends, charts |
| **Phase 8: Settings & Polish** | Week 12 | Settings page, false-positive workflow, export, documentation |

---

## 12. Future Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| **Pull Request integration** | High | Review PRs directly, post inline comments back to GitHub |
| **Slack/Teams notifications** | High | Alert on CRITICAL findings via webhook |
| **OWASP Dependency Check** | High | Run `dependency-check` CLI against `pom.xml` / `build.gradle` |
| **SpotBugs/PMD integration** | Medium | Run static analysis tools via Docker sidecar, parse XML reports |
| **SonarQube comparison** | Medium | Correlate findings with existing SonarQube issues to avoid duplication |
| **Metrics export (Prometheus)** | Medium | Expose `/metrics` endpoint for enterprise observability integration |
| **Multi-user authentication** | Low | Add JWT-based auth for team environments (LDAP/OAuth via Keycloak) |
| **Webhook-based triggering** | Medium | GitHub webhook → immediate review on push, eliminating polling latency |

---

## Appendix A: Key Dependencies (requirements.txt)

```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
pydantic-settings==2.3.0
PyGithub==2.3.0
apscheduler==3.10.4
anthropic==0.28.0
openai==1.35.0
cryptography==42.0.8
python-dotenv==1.0.1
httpx==0.27.0
```

## Appendix B: Key Dependencies (package.json)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0",
    "@tanstack/react-query": "^5.49.2",
    "zustand": "^4.5.4",
    "recharts": "^2.12.7",
    "axios": "^1.7.2",
    "react-hook-form": "^7.52.1",
    "date-fns": "^3.6.0",
    "tailwindcss": "^3.4.4",
    "lucide-react": "^0.400.0"
  }
}
```

---

*This document serves as the authoritative design reference for the Java Code Review Automation Platform. All implementation decisions should be validated against the architecture described here. Changes to core design decisions require an Architecture Review Board sign-off.*
