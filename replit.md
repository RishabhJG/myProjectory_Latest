# CareerStack AI

## Overview

CareerStack AI is a full-stack web platform that helps fresh graduates build, track, and showcase their practical project portfolios and measure job-readiness based on current market demand.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + ShadCN UI + Framer Motion + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### Frontend (artifacts/careerstack)
- React + Vite SPA with wouter routing
- Clerk authentication with sign-in/sign-up pages
- Pages: Landing, Dashboard, Portfolio, Scores, Roadmaps, Jobs, Profile

### Backend (artifacts/api-server)
- Express 5 API server with Clerk middleware
- RESTful API endpoints under /api

### Database Schema (lib/db)
- **users** - Student profiles with skills, interests, career goals
- **projects** - Portfolio projects with technologies, difficulty, completion status
- **roadmaps** - Technology learning roadmaps
- **milestones** - Roadmap milestones with status tracking
- **tasks** - Individual tasks within milestones
- **jobs** - Job listings with required skills
- **activity** - User activity feed

## Key Features

1. **Student Auth + Profile** - Clerk-based auth with career profile management
2. **Portfolio Builder** - Structured project submission with tech stack tracking
3. **Tech Stack Comfort Score** - Scoring engine analyzing project submissions
4. **Market Demand Engine** - Job market demand analysis per technology
5. **Job Readiness Score** - Dynamic score combining comfort, demand, roadmap, portfolio
6. **Industry Roadmap Generator** - Milestone-based learning roadmaps (Python, React, JavaScript + dynamic)
7. **Task Tracker** - Color-coded milestone/task progress tracking
8. **Job Listings** - Seeded job data with tech filtering
9. **Job Matching** - Skill-based job matching with match scores
10. **Dashboard** - Summary stats, skill gaps, recent activity

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Endpoints

- `GET /api/profile` - Get user profile
- `POST /api/profile` - Create profile
- `PATCH /api/profile` - Update profile
- `GET/POST /api/projects` - List/create projects
- `GET/PATCH/DELETE /api/projects/:id` - Project CRUD
- `GET /api/scores/tech-comfort` - Tech comfort scores
- `GET /api/scores/market-demand` - Market demand scores
- `GET /api/scores/job-readiness` - Job readiness score
- `GET/POST /api/roadmaps` - List/generate roadmaps
- `GET /api/roadmaps/:id` - Roadmap detail with milestones
- `PATCH /api/roadmaps/:roadmapId/tasks/:taskId/toggle` - Toggle task
- `GET /api/jobs` - List jobs (filterable by tech)
- `GET /api/jobs/matches` - Job matches for user
- `GET /api/dashboard/summary` - Dashboard summary
- `GET /api/dashboard/skill-gaps` - Skill gap analysis
- `GET /api/dashboard/recent-activity` - Recent activity

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
