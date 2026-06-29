# AM 360 — Next.js + Prisma + Postgres (Vercel-ready)

Multi-tenant academy-management SaaS. Single Next.js 14 (App Router) app:
React frontend + serverless API routes, backed by PostgreSQL via Prisma ORM.

## Stack
- Next.js 14 App Router (React 18, TypeScript)
- API routes under `src/app/api/*` (Node runtime)
- **Prisma ORM + PostgreSQL** (relational schema, type-safe queries)
- JWT (jsonwebtoken) + bcryptjs auth, multi-tenant by `academy_id`

## Environment variables
| Key | What |
|-----|------|
| `DATABASE_URL` | Postgres connection string. Use the **pooled** URL for serverless. |
| `JWT_SECRET` | long random string — `openssl rand -hex 32` |

## Run locally
1. `npm install`  (runs `prisma generate` automatically)
2. Copy `.env.example` → `.env` and fill in values
3. `npx prisma db push`  — creates the tables in your database
4. `npm run dev` → http://localhost:3000

## Pick a free Postgres host
- **Neon** (recommended): free, serverless, no per-operation cap. Use the
  `...-pooler...` connection string for `DATABASE_URL`.
- **Prisma Postgres**: free tier (100k ops/mo, 1 GiB), pooling built in.
- **Supabase**: free Postgres (adds auth/storage if you want them later).

## Deploy to Vercel (free Hobby tier)
1. Create a free Postgres database (Neon/Prisma Postgres/Supabase) and copy the
   **pooled** connection string.
2. Push this folder to a GitHub repo.
3. vercel.com → New Project → import the repo.
4. Add `DATABASE_URL` and `JWT_SECRET` in Project Settings → Environment Variables.
5. Deploy. The build runs `prisma generate && next build` automatically.
6. **One-time:** create the tables — run `npx prisma db push` locally against the
   same `DATABASE_URL`, or add it as a build/deploy step.

No `vercel.json` needed; Next.js is auto-detected. API + frontend share one domain (no CORS).

## What's implemented (complete, 1:1 with the original)
- **API**: auth, academy, branches, trainers, students, attendance, sessions,
  attendance summary, fees, schedules, analytics dashboard.
- **Admin**: Dashboard (stats, 7-day trend, branch overview), Branches CRUD,
  Branch detail (Students / Attendance + up to 2 class photos / Fees / Schedule),
  Trainers CRUD (multi-branch), Settings (academy name, description, logo).
- **Trainer**: Workspace (branch picker + students/attendance/fees/schedule),
  personal Schedule with TODAY highlight, Profile.

## Design notes / improvements baked in
- Relational schema with proper indexes (academy_id, branch_id, date; unique email).
- JWT secret fails loudly if unset (no insecure fallback).
- Serverless-safe Prisma client singleton.
- Field names kept snake_case and dates kept as strings so the JSON API contract
  is identical to the original frontend (no UI changes needed).

## Recommended next step
- Move class photos / logos from base64 to a URL field + Cloudinary/S3.
  (The `photos`/`logo_base64` fields currently store base64 to match the original.)
