# CareerStack AI

A full-stack web platform that helps fresh graduates build, track, and showcase their practical project portfolios and measure job-readiness based on current market demand.

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + ShadCN UI + Framer Motion + Recharts
- **Backend**: Express 5 + Node.js
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **Validation**: Zod, drizzle-zod
- **API Codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle for backend)

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 24+ | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 9+ | `npm install -g pnpm` |
| **Docker** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |

> **Note:** Docker is used to run PostgreSQL. If you already have PostgreSQL 16 installed locally, you can skip Docker and connect directly.

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd Career-Stack-AI
pnpm install
```

### 2. Set Up Environment Variables

```bash
# Windows (PowerShell)
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Edit `.env` and fill in your Clerk API keys (get them from [Clerk Dashboard](https://dashboard.clerk.com)):

```env
CLERK_SECRET_KEY=sk_test_your_key_here
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 3. Start PostgreSQL (Docker)

```bash
docker run --name careerstack-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=careerstack \
  -p 5432:5432 \
  -d postgres:16
```

**Windows PowerShell** (single line):
```powershell
docker run --name careerstack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=careerstack -p 5432:5432 -d postgres:16
```

To stop/start later:
```bash
docker stop careerstack-db
docker start careerstack-db
```

<details>
<summary><strong>Alternative: Install PostgreSQL directly (without Docker)</strong></summary>

1. Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. During installation, set password to `postgres` (or whatever you prefer)
3. After installation, create the database:
   ```bash
   psql -U postgres -c "CREATE DATABASE careerstack;"
   ```
4. Update `DATABASE_URL` in `.env` to match your credentials.

</details>

### 4. Push Database Schema

```bash
pnpm --filter @workspace/db run push
```

This creates all the tables defined in the Drizzle schema.

### 5. Run the Application

Open **two terminals**:

**Terminal 1 — Backend API Server:**
```bash
pnpm --filter @workspace/api-server run dev
```
The API will be available at `http://localhost:3000/api`

**Terminal 2 — Frontend Dev Server:**
```bash
pnpm --filter @workspace/careerstack run dev
```
The frontend will be available at `http://localhost:5173`

> The backend proxies the frontend in development mode, so you can also access everything through `http://localhost:3000`.

## Project Structure

```
Career-Stack-AI/
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   ├── careerstack/         # React + Vite frontend
│   └── mockup-sandbox/      # Component preview sandbox
├── lib/
│   ├── api-client-react/    # Generated API hooks (React Query)
│   ├── api-spec/            # OpenAPI specification + Orval codegen
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema + DB connection
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace configuration
└── .env.example             # Environment variable template
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run typecheck` | Full typecheck across all packages |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm --filter @workspace/api-server run dev` | Run API server |
| `pnpm --filter @workspace/careerstack run dev` | Run frontend |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks/schemas from OpenAPI spec |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check |
| GET/POST | `/api/profile` | Get/create user profile |
| PATCH | `/api/profile` | Update profile |
| GET/POST | `/api/projects` | List/create projects |
| GET/PATCH/DELETE | `/api/projects/:id` | Project CRUD |
| GET | `/api/scores/tech-comfort` | Tech comfort scores |
| GET | `/api/scores/market-demand` | Market demand scores |
| GET | `/api/scores/job-readiness` | Job readiness score |
| GET/POST | `/api/roadmaps` | List/generate roadmaps |
| GET | `/api/roadmaps/:id` | Roadmap detail with milestones |
| PATCH | `/api/roadmaps/:roadmapId/tasks/:taskId/toggle` | Toggle task |
| GET | `/api/jobs` | List jobs (filterable) |
| GET | `/api/jobs/matches` | Job matches for user |
| GET | `/api/dashboard/summary` | Dashboard summary |
| GET | `/api/dashboard/skill-gaps` | Skill gap analysis |
| GET | `/api/dashboard/recent-activity` | Recent activity |

## Key Features

1. **Student Auth + Profile** — Clerk-based auth with career profile management
2. **Portfolio Builder** — Structured project submission with tech stack tracking
3. **Tech Stack Comfort Score** — Scoring engine analyzing project submissions
4. **Market Demand Engine** — Job market demand analysis per technology
5. **Job Readiness Score** — Dynamic score combining comfort, demand, roadmap, portfolio
6. **Industry Roadmap Generator** — Milestone-based learning roadmaps
7. **Task Tracker** — Color-coded milestone/task progress tracking
8. **Job Listings** — Seeded job data with tech filtering
9. **Job Matching** — Skill-based job matching with match scores
10. **Dashboard** — Summary stats, skill gaps, recent activity
