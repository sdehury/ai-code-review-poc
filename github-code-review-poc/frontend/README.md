# Frontend — Developer Guide

React 18 / TypeScript single-page application providing the code review dashboard for the Java Code Review Platform.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running Locally (without Docker)](#running-locally-without-docker)
- [Environment Variables](#environment-variables)
- [Pages](#pages)
- [Component Architecture](#component-architecture)
- [API Client](#api-client)
- [State Management](#state-management)
- [Styling](#styling)
- [Testing with Playwright](#testing-with-playwright)
- [Building for Production](#building-for-production)
- [Adding a New Page](#adding-a-new-page)
- [Adding a New Component](#adding-a-new-component)
- [Code Conventions](#code-conventions)

---

## Tech Stack

| Library | Version | Role |
|---------|---------|------|
| [React](https://react.dev/) | 18.3 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.2 | Static typing |
| [Vite](https://vitejs.dev/) | 5.3 | Build tool and dev server |
| [React Router](https://reactrouter.com/) | 6.24 | Client-side routing |
| [TanStack Query](https://tanstack.com/query/) | 5.49 | Server state — fetching, caching, refetching |
| [Axios](https://axios-http.com/) | 1.7 | HTTP client |
| [Recharts](https://recharts.org/) | 2.12 | Charts (line, bar, pie/donut) |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first styling |
| [lucide-react](https://lucide.dev/) | 0.400 | Icon library |
| [date-fns](https://date-fns.org/) | 3.6 | Date formatting |
| [clsx](https://github.com/lukeed/clsx) | 2.1 | Conditional class names |
| [Playwright](https://playwright.dev/) | 1.45 | E2E and API testing |

---

## Project Structure

```
frontend/
├── Dockerfile                    # Multi-stage: node builder → nginx:alpine
├── nginx.conf                    # SPA routing + /api proxy to backend
├── playwright.config.ts          # Playwright configuration
├── vite.config.ts                # Vite config with /api proxy for dev
├── tailwind.config.js
├── tsconfig.json
├── package.json
│
├── src/
│   ├── main.tsx                  # React root, QueryClient setup
│   ├── App.tsx                   # BrowserRouter + all route definitions
│   ├── index.css                 # Tailwind directives
│   ├── vite-env.d.ts             # ImportMeta type augmentation
│   │
│   ├── types/
│   │   └── index.ts              # All shared TypeScript interfaces
│   │
│   ├── services/
│   │   └── api.ts                # Axios instance + typed API functions
│   │
│   ├── pages/                    # One file per route
│   │   ├── Dashboard.tsx
│   │   ├── Repositories.tsx
│   │   ├── RepositoryDetail.tsx
│   │   ├── Reviews.tsx
│   │   ├── ReviewDetail.tsx
│   │   ├── Developers.tsx
│   │   ├── SecurityFindings.tsx
│   │   └── TechDebt.tsx
│   │
│   └── components/
│       ├── layout/
│       │   ├── Layout.tsx        # Sidebar + Header + <Outlet />
│       │   ├── Sidebar.tsx       # Navigation links
│       │   └── Header.tsx        # API status indicator
│       │
│       ├── dashboard/
│       │   ├── KPICard.tsx           # Metric card with icon and colour
│       │   ├── FindingsTrendChart.tsx # Multi-line chart (Recharts)
│       │   └── SeverityDonut.tsx     # Donut/pie chart (Recharts)
│       │
│       └── shared/
│           ├── SeverityBadge.tsx  # CRITICAL / HIGH / MEDIUM / LOW / INFO
│           ├── StatusBadge.tsx    # COMPLETED / RUNNING / PENDING / FAILED
│           ├── LoadingSpinner.tsx # Centred spinner with message
│           └── EmptyState.tsx     # Centred icon + title + description
│
└── tests/
    └── e2e/
        ├── helpers.ts             # Shared utilities: navigateTo, createTestRepo
        ├── 01-api-health.spec.ts
        ├── 02-repositories-api.spec.ts
        ├── 03-findings-api.spec.ts
        ├── 04-dashboard-ui.spec.ts
        ├── 05-repositories-ui.spec.ts
        ├── 06-navigation.spec.ts
        ├── 07-reviews-ui.spec.ts
        ├── 08-security-ui.spec.ts
        └── 09-analysis-engine.spec.ts
```

---

## Running Locally (without Docker)

Requires the backend API to be running (either via Docker or locally).

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Start dev server with hot reload on port 3000
npm run dev
```

The dev server proxies `/api/*` and `/health` requests to `http://localhost:8000` (configured in `vite.config.ts`).

Open `http://localhost:3000` in your browser.

### Type check (without building)

```bash
npx tsc --noEmit
```

### Build output preview

```bash
npm run build      # output in dist/
npm run preview    # serve dist/ locally
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `""` (empty) | Base URL for API requests. Empty means relative URLs — requests go to the same host, which nginx proxies to the backend. For local dev the Vite proxy handles this automatically. |

Set in a `.env.local` file (not committed):

```bash
VITE_API_BASE_URL=http://localhost:8000
```

In Docker the nginx config handles the proxy so this variable is not needed.

---

## Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `Dashboard.tsx` | KPI cards, 30-day trend chart, severity donut, recent reviews |
| `/repositories` | `Repositories.tsx` | List all repos, add repo form, trigger review, delete |
| `/repositories/:id` | `RepositoryDetail.tsx` | Commit list, schedule config editor |
| `/reviews` | `Reviews.tsx` | All reviews with status, score, and date |
| `/reviews/:id` | `ReviewDetail.tsx` | Per-finding accordion, AI summary, scores by category |
| `/developers` | `Developers.tsx` | Leaderboard: commits, code churn, critical/high findings, risk score |
| `/security` | `SecurityFindings.tsx` | All SECURITY category findings; false-positive and resolve actions |
| `/techdebt` | `TechDebt.tsx` | TECH_DEBT findings with a bar chart by rule |

---

## Component Architecture

### Layout

`Layout.tsx` uses React Router's `<Outlet />` pattern:

```
<Layout>
  └── <Sidebar />           fixed left nav
  └── <Header />            top bar with API status
  └── <main>
        <Outlet />          ← page component renders here
      </main>
```

### Shared components

All shared components accept a `data-testid` attribute so Playwright tests can target them reliably.

```tsx
// SeverityBadge
<SeverityBadge severity="CRITICAL" />

// StatusBadge
<StatusBadge status="COMPLETED" />

// LoadingSpinner
<LoadingSpinner message="Loading dashboard..." />

// EmptyState
import { GitBranch } from 'lucide-react'
<EmptyState icon={GitBranch} title="No repositories" description="Add one to get started" />
```

### KPICard

```tsx
import KPICard from '../components/dashboard/KPICard'
import { AlertTriangle } from 'lucide-react'

<KPICard
  title="Critical Findings"
  value={12}
  icon={AlertTriangle}
  color="red"              // blue | red | orange | green | purple
  subtitle="2 new today"
  testId="kpi-critical"
/>
```

---

## API Client

`src/services/api.ts` exports one typed function per endpoint. All functions return the response data directly (not the Axios response object).

```typescript
import { getRepositories, createRepository, triggerReview } from '../services/api'

// In a component:
const repos = await getRepositories()                    // Repository[]
const repo  = await createRepository({ ... })            // Repository
await triggerReview(repoId)                              // { message, repository_id }
```

The Axios instance is configured with:
- `baseURL` — from `VITE_API_BASE_URL` env var (defaults to `""` for relative URLs)
- `timeout` — 30 seconds
- `Content-Type: application/json`

### Adding a new API call

```typescript
// In api.ts
export const getMyResource = (id: string) =>
  api.get<MyResourceType>(`/api/v1/myresource/${id}`).then(r => r.data)
```

---

## State Management

### Server state — TanStack Query

All data fetching uses TanStack Query (`useQuery` / `useMutation`). This handles caching, background refetching, loading and error states automatically.

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRepositories, deleteRepository } from '../services/api'

function MyComponent() {
  const qc = useQueryClient()

  // Fetch
  const { data, isLoading, isError } = useQuery({
    queryKey: ['repositories'],
    queryFn: getRepositories,
    refetchInterval: 30_000,  // optional auto-refresh
  })

  // Mutate
  const deleteMutation = useMutation({
    mutationFn: deleteRepository,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repositories'] }),
  })

  return (
    <button onClick={() => deleteMutation.mutate(repoId)}>
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
```

**Query key conventions:**

| Data | Query key |
|------|-----------|
| All repositories | `['repositories']` |
| Single repository | `['repository', id]` |
| Commits for repo | `['commits', repoId]` |
| All reviews | `['reviews']` |
| Single review | `['review', id]` |
| Findings for review | `['findings', reviewId]` |
| SECURITY findings | `['findings', 'SECURITY']` |
| TECH_DEBT findings | `['findings', 'TECH_DEBT']` |
| All developers | `['developers']` |
| Dashboard summary | `['dashboard-summary']` |
| Dashboard trends | `['dashboard-trends']` |

### Client state

There is no global client-side state store. Local component state (`useState`) is sufficient for all UI state (form values, modal open/closed, etc.).

---

## Styling

Tailwind CSS with a dark-theme base. Key classes:

| Pattern | Class |
|---------|-------|
| Page background | `bg-gray-950` |
| Card background | `bg-gray-900 border border-gray-800 rounded-xl` |
| Muted text | `text-gray-400` |
| Table divider | `divide-y divide-gray-800` |
| Primary button | `bg-blue-600 hover:bg-blue-700 text-white` |
| Danger button | `text-red-400 hover:text-red-300` |

Custom colours are defined in `tailwind.config.js`:

```js
colors: {
  brand:    { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#d97706',
  low:      '#16a34a',
}
```

---

## Testing with Playwright

### Setup (first time)

```bash
cd frontend
npm install --legacy-peer-deps
npx playwright install chromium
```

### Running tests

The Docker stack must be running (`docker compose up -d`).

```bash
# All 65 tests
BASE_URL=http://localhost:3000 API_URL=http://localhost:8000 npx playwright test

# Single file
npx playwright test tests/e2e/01-api-health.spec.ts

# Headed (see the browser)
npx playwright test --headed

# Interactive UI mode
npx playwright test --ui

# Debug mode (pause on failure)
npx playwright test --debug

# HTML report
npx playwright show-report
```

### Test organisation

Tests are numbered to control execution order (they run sequentially, `workers: 1`).

| Suite | Type | Runs Against |
|-------|------|-------------|
| `01–03` | API / request-level | Backend API directly (no browser) |
| `04–08` | UI / browser | Frontend + Backend |
| `09` | Integration smoke | Backend API directly |

### Writing a new test

```typescript
// tests/e2e/10-my-feature.spec.ts
import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL, API_URL } from './helpers'

test.describe('My Feature', () => {

  test('renders correctly', async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/my-page`)
    await expect(page.getByTestId('my-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('My Page')
  })

  test('API returns correct shape', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/my-resource`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
```

### `data-testid` convention

Every interactive element and major section should have a `data-testid`:

```tsx
<div data-testid="repositories-page">
  <button data-testid="add-repo-btn">Add</button>
  <form data-testid="add-repo-form">
    <input data-testid="repo-name-input" />
  </form>
</div>
```

Playwright targets them with `page.getByTestId('...')` which uses `[data-testid="..."]` under the hood.

### Helpers

`tests/e2e/helpers.ts` provides:

| Function | Description |
|----------|-------------|
| `navigateTo(page, path)` | `page.goto` + waits for load + waits for spinner to disappear |
| `waitForPageLoad(page)` | waits for `networkidle` + optional spinner |
| `createTestRepo(page, fullName)` | POST to API — creates a test repo |
| `cleanupTestRepos(page, prefix)` | DELETE all repos with matching owner prefix |

---

## Building for Production

```bash
npm run build
```

Output goes to `dist/`. The Dockerfile uses a multi-stage build:

1. **Stage 1 (`builder`)** — `node:20-alpine`, installs deps, runs `npm run build`
2. **Stage 2** — `nginx:alpine`, copies `dist/` and `nginx.conf`

The nginx config:
- Serves static files with `try_files $uri /index.html` for SPA routing
- Proxies `/api/*` and `/health` to `http://backend:8000`
- Enables gzip compression

---

## Adding a New Page

1. Create `src/pages/MyPage.tsx` with `data-testid="my-page"` on the root element
2. Add a route in `App.tsx`:
   ```tsx
   <Route path="my-page" element={<MyPage />} />
   ```
3. Add a nav entry in `Sidebar.tsx`:
   ```tsx
   { to: '/my-page', label: 'My Page', icon: SomeIcon },
   ```
4. Add a Playwright test in `tests/e2e/`

---

## Adding a New Component

1. Create `src/components/<category>/MyComponent.tsx`
2. Add `data-testid` props to all interactive elements and key containers
3. Use Tailwind utility classes consistent with the dark theme
4. Export as default: `export default function MyComponent(...) { ... }`
5. For chart components, wrap Recharts in a `ResponsiveContainer` and add a `data-testid` on the outer `<div>`

---

## Code Conventions

| Convention | Detail |
|------------|--------|
| **Component format** | Default export function components; no class components |
| **Props typing** | Inline `interface Props { ... }` above the component; never use `any` |
| **Imports** | External libraries first, then internal (`../`) — no import sorting tool enforced |
| **Query keys** | Always arrays; be specific enough to invalidate only what changed |
| **Mutation feedback** | Show `isPending` on buttons; call `qc.invalidateQueries` on success |
| **Error handling** | Use `isError` from `useQuery`; show a user-facing message not a raw error |
| **Dates** | Always format with `date-fns` (`format`, `parseISO`); never use `new Date().toString()` |
| **Tailwind** | Prefer utility classes over custom CSS; use `clsx()` for conditional classes |
| **test-ids** | `kebab-case`; descriptive enough to identify element without reading the code |
| **No inline styles** | Use Tailwind; never `style={{ ... }}` |
