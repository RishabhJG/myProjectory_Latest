# Walkthrough: Replit Dependency Removal

## Summary

Removed **all Replit-specific dependencies, configurations, and platform assumptions** from the CareerStack AI monorepo. The project now runs fully locally on Windows (or any OS) without any Replit dependency.

## Changes Made

### Files Deleted (6)
| File | Purpose |
|------|---------|
| `.replit` | Replit runtime config (modules, deployment, ports, nix) |
| `.replitignore` | Replit deployment ignore file |
| `replit.md` | Replit-specific project documentation |
| `artifacts/api-server/.replit-artifact/` | Replit artifact orchestration |
| `artifacts/careerstack/.replit-artifact/` | Replit artifact orchestration |
| `artifacts/mockup-sandbox/.replit-artifact/` | Replit artifact orchestration |

### Files Created (2)

| File | Purpose |
|------|---------|
| [.env.example](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/.env.example) | Environment variable template with Docker PostgreSQL instructions |
| [README.md](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/README.md) | Local development setup guide (replaces replit.md) |

### Files Modified (13)

#### Workspace Level

| File | Changes |
|------|---------|
| [pnpm-workspace.yaml](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/pnpm-workspace.yaml) | Removed `@replit/*` catalog entries, exclusions, platform-specific binary overrides (~80 lines of Linux-only overrides removed) |
| [package.json](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/package.json) | Replaced Unix-only `sh -c` preinstall with cross-platform `npx only-allow pnpm` |
| [.gitignore](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/.gitignore) | Added `.env` files, removed Replit section comment |

#### Frontend (`artifacts/careerstack`)

| File | Changes |
|------|---------|
| [vite.config.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/vite.config.ts) | Removed 3 Replit Vite plugins, `REPL_ID` conditional, default PORT=5173 |
| [package.json](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/package.json) | Removed 3 `@replit/vite-plugin-*` dependencies |
| [button.tsx](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/src/components/ui/button.tsx) | Cleaned `@replit` style comments |
| [badge.tsx](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/src/components/ui/badge.tsx) | Cleaned `@replit` style comments |
| [Sidebar.tsx](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/src/components/layout/Sidebar.tsx) | Fixed Clerk `UserButton` unsupported prop |
| [[id].tsx](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/careerstack/src/pages/roadmaps/%5Bid%5D.tsx) | Added missing `CardDescription` import |

#### Mockup Sandbox (`artifacts/mockup-sandbox`)

| File | Changes |
|------|---------|
| [vite.config.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/mockup-sandbox/vite.config.ts) | Removed 2 Replit Vite plugins, `REPL_ID` conditional, default PORT=5174 |
| [package.json](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/mockup-sandbox/package.json) | Removed 2 `@replit/vite-plugin-*` dependencies |

#### Backend (`artifacts/api-server`)

| File | Changes |
|------|---------|
| [package.json](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/api-server/package.json) | `cross-env` for Windows-compatible dev script |
| [src/index.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/api-server/src/index.ts) | Default PORT=3000 instead of throwing |
| [src/app.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/api-server/src/app.ts) | Default FRONTEND_PORT=5173 |
| [clerkProxyMiddleware.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts) | Removed `.replit.app` domain reference |

#### Libraries

| File | Changes |
|------|---------|
| [lib/api-zod/src/index.ts](file:///c:/Users/abc/OneDrive/Desktop/Minor%20Project%20Execution/Career-Stack-AI/lib/api-zod/src/index.ts) | Fixed duplicate export ambiguity between Zod schemas and TS types |

---

## Verification Results

| Test | Result |
|------|--------|
| `grep -ri "replit"` (excluding node_modules, lockfile) | **0 results** ✅ |
| `pnpm install` | **501 packages installed** ✅ |
| `pnpm run typecheck` | **All 4 workspaces pass** ✅ |
| `pnpm --filter @workspace/api-server run build` | **Build successful** ✅ |
| `pnpm --filter @workspace/careerstack run build` | **Build successful** ✅ |

---

## How to Run Locally

### Quick Start

```powershell
# 1. Copy environment template
copy .env.example .env
# Edit .env with your Clerk API keys

# 2. Start PostgreSQL via Docker
docker run --name careerstack-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=careerstack -p 5432:5432 -d postgres:16

# 3. Push database schema
pnpm --filter @workspace/db run push

# 4. Start API server (Terminal 1)
pnpm --filter @workspace/api-server run dev

# 5. Start frontend (Terminal 2)
pnpm --filter @workspace/careerstack run dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Full app** (via backend proxy): http://localhost:3000
