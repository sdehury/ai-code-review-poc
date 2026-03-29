# Java Code Review Platform

An automated code review platform that analyses Java/Spring Framework commits from GitHub repositories, detects security vulnerabilities and technical debt, and presents findings through an interactive React dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Services](#services)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Developer Docs](#developer-docs)
- [Troubleshooting](#troubleshooting)

---

## Overview

| Capability | Detail |
|-----------|--------|
| **Languages reviewed** | Java, Spring Framework |
| **Source** | GitHub repositories via REST API v3 |
| **Detection** | Pattern-based (8 security rules, 6 tech-debt rules) + optional AI (Claude/OpenAI) |
| **Scheduling** | Per-repository cron — configurable from the UI |
| **Persistence** | PostgreSQL 16, schema managed by Flyway |
| **Deployment** | Docker Compose — 4 containers, runs on Docker Desktop |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Desktop                                             │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  frontend    │   │  backend     │   │  postgres      │  │
│  │  React 18    │◄──│  FastAPI     │◄──│  PostgreSQL 16 │  │
│  │  nginx:80    │   │  Python 3.12 │   │  Port 5432     │  │
│  │  Port 3000   │   │  Port 8000   │   └────────────────┘  │
│  └──────────────┘   └──────────────┘                        │
│                            ▲                                │
│                     ┌──────┴──────┐                         │
│                     │   flyway    │ (init container)        │
│                     │  Migrations │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   http://localhost:3000  http://localhost:8000
```

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — Windows / macOS / Linux
- Docker Compose v2 (bundled with Docker Desktop)

### 1. Clone and configure

```bash
git clone <repo-url>
cd github-code-review-poc

# Copy the environment template
cp .env.example .env
```

Edit `.env` — the only required change for local development is setting a real `DB_PASSWORD`:

```bash
DB_PASSWORD=my_secure_password
```

To enable AI-powered code review, also set:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Start the stack

```bash
docker compose up -d
```

On first run this:
1. Pulls `postgres:16-alpine`, `flyway:10`, builds `backend` and `frontend` images
2. Starts PostgreSQL and waits for it to be healthy
3. Runs Flyway migrations (V1–V9) to create all tables and seed data
4. Starts the FastAPI backend (waits for Flyway to complete)
5. Starts the React frontend served by nginx

### 3. Open the dashboard

| URL | Service |
|-----|---------|
| http://localhost:3000 | React Dashboard |
| http://localhost:8000/docs | FastAPI Swagger UI |
| http://localhost:8000/health | Health check |

### 4. Add your first repository

1. Navigate to **Repositories** in the sidebar
2. Click **Add Repository**
3. Enter `owner/repo` (e.g. `spring-projects/spring-boot`)
4. Optionally enter a GitHub Personal Access Token for private repos
5. Click **Add Repository**
6. Click the **Review** button to trigger an immediate analysis

---

## Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | 5432 | Primary data store |
| `flyway` | `flyway/flyway:10` | — | DDL migration runner (exits after completion) |
| `backend` | Built from `./backend` | 8000 | FastAPI REST API + APScheduler |
| `frontend` | Built from `./frontend` | 3000 | React SPA served by nginx |

### Useful commands

```bash
# View running containers and health
docker compose ps

# Follow backend logs
docker compose logs -f backend

# Follow all logs
docker compose logs -f

# Restart only the backend (e.g. after a code change)
docker compose restart backend

# Rebuild and restart a single service
docker compose up -d --build backend

# Rebuild everything from scratch
docker compose down -v && docker compose up -d --build

# Open a psql shell
docker exec -it codereview_postgres psql -U codereview -d codereview

# Run database migrations manually
docker compose run --rm flyway migrate
```

---

## Environment Variables

All variables are read from the `.env` file in the project root.

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_NAME` | `codereview` | PostgreSQL database name |
| `DB_USER` | `codereview` | PostgreSQL user |
| `DB_PASSWORD` | *(required)* | PostgreSQL password |
| `ENCRYPTION_KEY` | `000...0` (64 hex chars) | AES-256 key for encrypting GitHub tokens at rest. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `AI_PROVIDER` | `disabled` | AI review provider: `anthropic`, `openai`, or `disabled` |
| `AI_MODEL` | `claude-opus-4-6` | Model ID for AI review |
| `ANTHROPIC_API_KEY` | *(empty)* | Anthropic API key (required when `AI_PROVIDER=anthropic`) |
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key (required when `AI_PROVIDER=openai`) |
| `SCHEDULER_TIMEZONE` | `UTC` | Timezone for cron scheduling |

---

## Running Tests

Tests use [Playwright](https://playwright.dev/) and require the Docker stack to be running.

```bash
cd frontend

# Install dependencies (first time only)
npm install --legacy-peer-deps

# Install Playwright browser
npx playwright install chromium

# Run all 65 tests
BASE_URL=http://localhost:3000 API_URL=http://localhost:8000 npx playwright test

# Run with visible browser (headed mode)
BASE_URL=http://localhost:3000 API_URL=http://localhost:8000 npx playwright test --headed

# Run a specific test file
npx playwright test tests/e2e/01-api-health.spec.ts

# Open the HTML report
npx playwright show-report
```

**Test suites:**

| File | Tests | What it covers |
|------|-------|---------------|
| `01-api-health.spec.ts` | 9 | All API endpoints, status codes, response shapes |
| `02-repositories-api.spec.ts` | 9 | Repository CRUD, schedule config, trigger |
| `03-findings-api.spec.ts` | 5 | Findings filters, false-positive, resolve |
| `04-dashboard-ui.spec.ts` | 8 | KPI cards, charts, navigation |
| `05-repositories-ui.spec.ts` | 6 | Add repo form, validation, empty state |
| `06-navigation.spec.ts` | 8 | All pages, active link, redirect, title |
| `07-reviews-ui.spec.ts` | 3 | Reviews page, table, status badges |
| `08-security-ui.spec.ts` | 9 | Security, tech debt, developers pages |
| `09-analysis-engine.spec.ts` | 6 | End-to-end workflow integration |

---

## Developer Docs

- [Backend Developer Guide](backend/README.md) — FastAPI, SQLAlchemy, analyzers, scheduler
- [Frontend Developer Guide](frontend/README.md) — React, components, pages, Playwright tests

---

## Troubleshooting

### Flyway migration fails

```bash
# Check flyway logs
docker compose logs flyway

# Repair migration checksum mismatch (dev only)
docker compose run --rm flyway repair
```

### Backend is unhealthy

```bash
docker compose logs backend
# Confirm postgres is healthy first
docker compose ps postgres
```

### Port already in use

Edit `docker-compose.yml` and change the host-side port mapping:
```yaml
ports:
  - "8001:8000"   # backend on 8001 instead of 8000
```

### Reset everything

```bash
docker compose down -v   # removes containers AND volumes (deletes all data)
docker compose up -d --build
```
