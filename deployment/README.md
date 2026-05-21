# CareerStack API Server - Deployment Package

## Overview
This package contains the production-ready API server for CareerStack. It's built with Node.js (ESBuild-compiled) and configured for MySQL database connectivity.

## Structure
```
deployment/
├── api-server/              # Compiled API server
│   ├── dist/                # Generated from esbuild
│   └── *.mjs                # Entry points
├── config/                  # Configuration files
│   └── job_sources.json     # Job fetcher sources
├── package.json             # Dependencies
├── pnpm-lock.yaml           # Lock file
└── .env.production          # Production environment variables (CREATE THIS)
```

## Pre-Deployment Setup

### 1. Create `.env.production` file
Create this file in the deployment root with:
```env
# Database
DATABASE_URL=mysql2://[user]:[password]@[host]:[port]/careerstack

# Clerk Auth (get from Clerk dashboard)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Server
PORT=3000
NODE_ENV=production

# Optional
SKIP_ADMIN_CHECK=false
LOG_LEVEL=info
```

### 2. Install Node.js
Ensure Node.js 18+ is installed on your CPanel server.

### 3. Install Dependencies
```bash
pnpm install --frozen-lockfile
# or use npm if pnpm not available:
npm install
```

### 4. Start Server
```bash
node api-server/index.mjs
```

Or use a process manager (PM2, Forever, Systemd):
```bash
pm2 start api-server/index.mjs --name "careerstack-api"
```

## Database Requirements
- MySQL 8.0+ running
- Database created: `careerstack`
- User with full privileges on this database
- All schema tables already created (via Drizzle migrations)

## Key Routes
- `GET /api/health` - Health check
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project (requires auth)
- `GET /api/portfolio/:id` - Portfolio details
- And many more (see API spec at `/api/openapi.yaml`)

## Notes
- All routes require Clerk authentication (Bearer token)
- Admin routes require admin role in Clerk metadata
- Database schema must be synchronized before deployment
- For production, use a reverse proxy (Nginx, Apache) in front

## Troubleshooting
- Check logs: `NODE_ENV=production node api-server/index.mjs`
- Verify database connection string
- Ensure Clerk keys are valid and published
- Check port 3000 is not in use or change PORT env var
