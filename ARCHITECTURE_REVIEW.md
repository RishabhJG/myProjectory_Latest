# VertX - Deep Architecture & Codebase Review

Date: April 11, 2026
Workspace: VertX monorepo

---

## 1) Project Overview

### What this project is trying to do
VertX is a full-stack platform aimed at helping students and fresh graduates become job-ready by:
- building a professional profile,
- showcasing portfolio projects,
- generating learning roadmaps,
- matching users to jobs,
- calculating readiness and skill-gap insights,
- and tracking market trends from scraped job postings.

Primary product framing appears in:
- README.md
- artifacts/careerstack/src/pages/dashboard.tsx
- artifacts/api-server/src/routes/dashboard.ts

### What problem it solves
The platform addresses the gap between "I built projects" and "I am market-ready" by combining:
- user portfolio data,
- job demand data,
- and computed scoring metrics.

### Who the users are
- Student/graduate users: use profile, projects, roadmaps, jobs, and scores.
- Admin users: trigger scraping and source management for job intelligence.

Relevant files:
- artifacts/careerstack/src/App.tsx
- artifacts/careerstack/src/components/layout/AppRoutes.tsx
- artifacts/api-server/src/middlewares/requireAuth.ts
- artifacts/api-server/src/routes/job-intelligence.ts

---

## 2) Tech Stack Breakdown

### Technologies and tools used

#### Monorepo and tooling
- pnpm workspaces: pnpm-workspace.yaml
- TypeScript project references: tsconfig.base.json, tsconfig.json
- Formatting: prettier (root package.json)

#### Backend
- Node.js + Express 5: artifacts/api-server/package.json
- Drizzle ORM + pg driver: lib/db/src/index.ts
- Clerk auth: artifacts/api-server/src/middlewares/requireAuth.ts
- Pino logging: artifacts/api-server/src/lib/logger.ts
- Cron scheduling: artifacts/api-server/src/services/jobsSync.ts
- HTTP + scraping libs: axios, cheerio

#### Frontend
- React + Vite: artifacts/careerstack/package.json, artifacts/careerstack/vite.config.ts
- Routing with Wouter: artifacts/careerstack/src/App.tsx
- Server-state with TanStack Query
- UI stack: Tailwind, Radix, framer-motion, recharts
- Clerk React SDK

#### Shared contract/codegen layer
- OpenAPI spec: lib/api-spec/openapi.yaml
- Orval codegen: lib/api-spec/orval.config.ts
- Generated React API client: lib/api-client-react/src/generated
- Generated Zod schemas: lib/api-zod/src/generated

### Why each might have been chosen
- pnpm monorepo for fast, deduped dependency management.
- Drizzle for typed SQL with relatively low abstraction overhead.
- OpenAPI + Orval to reduce API drift and hand-written client boilerplate.
- Clerk for managed auth and role metadata.
- Wouter likely for minimal routing complexity and low bundle overhead.

### Unusual or suboptimal choices
- Mixed API consumption strategy: generated hooks and manual fetch hooks coexist.
  - artifacts/careerstack/src/hooks/use-jobs-api.ts
  - artifacts/careerstack/src/hooks/use-analysis-api.ts
- Some route logic is in-memory filtering after broad DB reads.
  - artifacts/api-server/src/routes/jobs.ts
  - artifacts/api-server/src/routes/job-listings.ts
- Scraper config path depends on process cwd, which is brittle across run environments.
  - artifacts/api-server/src/services/job-intelligence/scraper.ts

---

## 3) Architecture & Design

### Overall architecture style
- Modular monolith backend + SPA frontend + shared typed libraries.
- Not microservices; one API artifact with route modules.

### Folder structure and responsibilities

#### Root
- workspace scripts and docs: package.json, README.md, walkthrough.md, scraper_workflow.md

#### API service
- artifacts/api-server/src/index.ts: server bootstrap
- artifacts/api-server/src/app.ts: middleware chain + router + dev proxy
- artifacts/api-server/src/routes/index.ts: route module registration
- artifacts/api-server/src/routes/*.ts: domain endpoints
- artifacts/api-server/src/services/*: jobs, trends, scoring, scraping logic

#### Frontend app
- artifacts/careerstack/src/main.tsx: React mount + ErrorBoundary
- artifacts/careerstack/src/App.tsx: Clerk provider, route guards, Query client
- artifacts/careerstack/src/components/layout/AppRoutes.tsx: page route map
- artifacts/careerstack/src/pages/*: feature screens
- artifacts/careerstack/src/hooks/*: API and utility hooks

#### Shared libs
- lib/db/src/schema/*: canonical table definitions
- lib/api-spec/*: API contract and codegen setup
- lib/api-client-react/*: generated client and custom fetch
- lib/api-zod/*: generated validators/types

### How parts interact
1. Browser route loads page components.
2. Page triggers query/mutation via generated or manual hooks.
3. Request reaches Express route under /api.
4. Auth middleware resolves user context.
5. Route reads/writes PostgreSQL through Drizzle schema package.
6. Response returns typed payload consumed by React Query cache/UI.

---

## 4) Core Features & Flows

### Major features
- Authentication and role-gated routes
- Profile creation and updates
- Project portfolio CRUD
- Dashboard summary + skill gaps + activity feed
- Job listing search/filter + saved jobs
- Job match scoring
- Roadmap generation and task progress
- Market intelligence scraping + trend analytics

### Key flow A: Sign in -> Dashboard
1. User signs in via Clerk routes in artifacts/careerstack/src/App.tsx.
2. Protected route gates dashboard access.
3. Dashboard page calls:
   - useGetDashboardSummary
   - useGetRecentActivity
   - useGetSkillGaps
4. API routes in artifacts/api-server/src/routes/dashboard.ts aggregate across users/projects/roadmaps/tasks/jobs/activity.

### Key flow B: Profile update
1. Profile page loads via useGetProfile.
2. Form validates with zod/react-hook-form.
3. Mutation calls PATCH /api/profile.
4. Backend validates via UpdateProfileBody and updates users table.

Files:
- artifacts/careerstack/src/pages/profile.tsx
- artifacts/api-server/src/routes/profile.ts

### Key flow C: Admin scraping -> trend refresh
1. Admin clicks Run Scraper on market-intelligence page.
2. Frontend calls GET /api/jobs/scrape.
3. Route requires admin and executes scrapeAllSources + analyzeTrends.
4. Scraper loads config URLs, parses each source, upserts scraped postings.
5. Trend analyzer recomputes technology frequencies and stack combos.

Files:
- artifacts/careerstack/src/pages/market-intelligence.tsx
- artifacts/api-server/src/routes/job-intelligence.ts
- artifacts/api-server/src/services/job-intelligence/scraper.ts
- artifacts/api-server/src/services/job-intelligence/parser.ts
- artifacts/api-server/src/services/job-intelligence/trendAnalyzer.ts

---

## 5) File-Level Intelligence

### Most important files and what they do

#### Backend entry and composition
- artifacts/api-server/src/index.ts
  - Starts HTTP server and logs boot status.
- artifacts/api-server/src/app.ts
  - Initializes logging, CORS, body parsers, Clerk middleware, API router, and frontend proxy.
- artifacts/api-server/src/routes/index.ts
  - Mounts all domain routers.

#### Frontend entry and route/auth orchestration
- artifacts/careerstack/src/main.tsx
  - App mount with ErrorBoundary.
- artifacts/careerstack/src/App.tsx
  - ClerkProvider, auth states, guarded routes, QueryClient setup.
- artifacts/careerstack/src/components/layout/AppRoutes.tsx
  - Main app route list.

#### Data model and shared contracts
- lib/db/src/index.ts
  - Database pool + Drizzle initialization.
- lib/db/src/schema/index.ts
  - Exports all schema modules.
- lib/api-spec/orval.config.ts
  - Generates typed client + zod schemas.
- lib/api-client-react/src/custom-fetch.ts
  - Custom fetch mutator with optional token injection.

### Entry points and execution flow
- API boot path: index.ts -> app.ts -> routes/index.ts -> route modules -> services.
- Frontend boot path: main.tsx -> App.tsx -> AppRoutes.tsx -> page-level hooks.

---

## 6) Data Flow & State Management

### Data fetch/store/update lifecycle
- Frontend:
  - React Query manages server state.
  - Route/page components call generated hooks or custom hooks.
- Backend:
  - Routes use Drizzle against PostgreSQL.
  - Zod validation is applied in selected routes.

### API calls
- Generated client path:
  - lib/api-client-react/src/generated
- Manual fetch path:
  - artifacts/careerstack/src/hooks/use-jobs-api.ts
  - artifacts/careerstack/src/hooks/use-analysis-api.ts

### State management
- Server-state: TanStack Query
- Local-state: React useState/useEffect/useForm
- Auth state: Clerk hooks and provider

### Side effects
- Background sync startup:
  - artifacts/api-server/src/services/jobsSync.ts is called from app.ts.
- Scraper side effects:
  - external HTTP calls + DB upserts from job-intelligence services.

---

## 7) Dependency & Integration Analysis

### External services and APIs
- Clerk:
  - Backend middleware + admin role check via public metadata.
  - Frontend provider and route guards.
- Adzuna:
  - Scheduled ingestion in jobFetcher.
- Greenhouse + Lever + generic sites:
  - Scraped via parser module.

### Integration quality and limitations
- Clerk integration is straightforward and coherent front/back.
- Market integrations are practical but fragile due to external format changes.
- Generic scraping parser is best-effort and likely inconsistent per site.

### Risks
- External API outages and throttling.
- HTML scraping drift over time.
- Manual source management writes local config file at runtime.

---

## 8) Code Quality Review

### Technical debt and bad practices
1. Duplicate route path declarations for /jobs in AppRoutes.
   - artifacts/careerstack/src/components/layout/AppRoutes.tsx
2. N+1 query patterns in dashboard and roadmaps aggregations.
   - artifacts/api-server/src/routes/dashboard.ts
   - artifacts/api-server/src/routes/roadmaps.ts
3. Full-table fetch then in-memory filtering.
   - artifacts/api-server/src/routes/jobs.ts
   - artifacts/api-server/src/routes/job-listings.ts
4. Mixed API layers (generated + manual) increase drift risk.
5. Hardcoded scoring constants spread across modules.

### Redundant or inefficient patterns
- Similar authed fetch helper logic duplicated across custom hooks.
- trendAnalyzer clears and reinserts full trend table each run.

### Missing abstractions
- No central config validation module for env vars.
- No unified analytics/query optimization layer for dashboard aggregates.

---

## 9) Scalability & Performance

### What likely breaks at 10k+ users
- Dashboard response times due to nested per-roadmap/per-milestone task queries.
- Jobs endpoints due to in-memory filtering and slicing.
- Trend analysis due to full-table reads and write-rebuild behavior.
- Scrape-on-request admin endpoint may timeout or block under larger source lists.

### Bottlenecks
- DB query shape (N+1 and non-index-optimized filters).
- CPU-heavy recomputation on every request in analytics endpoints.
- Synchronous sequential scraping loop.

---

## 10) Security Risks

### Auth/authorization concerns
- Development bypass with SKIP_ADMIN_CHECK can disable auth guards in dev mode.
  - artifacts/api-server/src/app.ts
  - artifacts/api-server/src/middlewares/requireAuth.ts

### Data exposure and abuse surface
- CORS currently allows credentials with origin=true in app.ts; needs tight deployment constraints.
- No visible request rate limiting middleware for abuse control.
- Admin scraper endpoints can trigger expensive outbound operations.

### Additional concerns
- Runtime file writes to config for source URLs may not be safe/portable in immutable deployments.

---

## 11) Improvement Roadmap (Priority Order)

### P1 - Correctness + security
1. Remove duplicate /jobs route declarations and keep one canonical jobs page.
2. Add strict env validation and fail-fast startup checks.
3. Harden auth bypass so it cannot accidentally run outside local development.
4. Add rate limiting and explicit CORS allowlist.

### P2 - Performance
1. Replace N+1 loops with aggregate SQL queries and joins.
2. Push filtering/pagination into SQL for jobs/job-listings endpoints.
3. Add caching/materialized summaries for dashboard and trend endpoints.

### P3 - Architecture cleanup
1. Standardize frontend API access on generated client + shared wrapper.
2. Consolidate scoring formulas into one module with explicit constants.
3. Wrap multi-step roadmap creation in DB transactions.

### P4 - Operability
1. Add structured metrics and alerts for sync/scrape failures.
2. Persist scraper failures to DB for observability and retry workflows.

---

## 12) Explain Like I'm Learning

Imagine VertX as a coaching center:
- Front desk (frontend) collects your profile and goals.
- Operations desk (API) verifies identity and runs calculations.
- Filing room (database) stores your progress.
- Research team (scrapers/trend services) monitors the job market.

Then the coach combines your personal file with market research and says:
"Here is your readiness score, here are your gaps, and here is what to do next."

That is the first-principles heart of this system: align personal capability data with external market demand, then convert it into actionable guidance.

---

## Appendix: Key Files to Read First

1. README.md
2. artifacts/api-server/src/app.ts
3. artifacts/api-server/src/routes/index.ts
4. artifacts/careerstack/src/App.tsx
5. artifacts/careerstack/src/components/layout/AppRoutes.tsx
6. lib/db/src/schema/index.ts
7. artifacts/api-server/src/routes/dashboard.ts
8. artifacts/api-server/src/routes/job-intelligence.ts
9. artifacts/api-server/src/services/job-intelligence/scraper.ts
10. artifacts/careerstack/src/pages/market-intelligence.tsx
