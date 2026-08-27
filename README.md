# Helix PMS

Performance management for a ~200-person services company (college project). Fictional firm: **Helix Consulting**.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Auth | [Clerk](https://clerk.com) (sign-in, sign-up, session, `UserButton`) |
| Database | [Supabase](https://supabase.com) Postgres via Prisma |
| Email | [Resend](https://resend.com) (feedback + review events) |
| Hosting | [Vercel](https://vercel.com) |

Roles live in Postgres (`ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`). The first Clerk sign-in with a seeded work email attaches `clerkId` to that directory row (webhook + lazy sync in `src/lib/auth.ts`).

## Features

- People directory (~200 colleagues) with manager chain and utilization
- Weighted goals for FY 2025–26
- Review packet: self → manager → HR calibration → acknowledge
- Competencies and 1–5 rating bands
- Praise / coaching / peer feedback
- Reports: rating spread, cycle throughput, department snapshot

## Local setup

1. Copy env and fill in keys:

```bash
cp .env.example .env
```

2. Create a Clerk application. Add `http://localhost:3000/sign-in` and `/sign-up` to allowed origins. Point the webhook to `http://localhost:3000/api/webhooks/clerk` (or a tunnel) for `user.created`, `user.updated`, `user.deleted`.

3. Create a Supabase project. From **Project Settings → Database**:
   - `DATABASE_URL` — transaction pooler (port **6543**) with `?pgbouncer=true`
   - `DIRECT_URL` — direct connection (port **5432**)
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from API settings

4. Create a Resend API key. Verify a sending domain, then set `RESEND_FROM`. Without `RESEND_API_KEY`, mail is logged and skipped.

5. Install, migrate, seed, run:

```bash
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create Clerk users whose emails match the seed (any password you choose in Clerk):

| Email | Role | Person |
| --- | --- | --- |
| `employee@helix.consulting` | Employee | Diya Patel |
| `manager@helix.consulting` | Manager | Rohan Desai |
| `hr@helix.consulting` | HR | Ananya Iyer |
| `admin@helix.consulting` | Admin | Kabir Shah |
| `ceo@helix.consulting` | Admin | Leela Menon |

If those domains are awkward in Clerk, change the seeded emails in `prisma/seed.ts` to addresses you control, re-seed, and sign up with those.

## Vercel

1. Import the GitHub repo.
2. Set the same environment variables as `.env.example` (use the production Clerk keys and `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`).
3. Build command is `prisma generate && next build` (already in `package.json`).
4. After first deploy, run migrate + seed once:

```bash
npx prisma migrate deploy
npm run db:seed
```

You can do that from a local machine against `DIRECT_URL`, or Vercel’s one-off CLI. Add the production webhook `https://your-app.vercel.app/api/webhooks/clerk` in Clerk.

Prisma `postinstall` generates the client on Vercel automatically.

## Project notes

Demonstration system — do not load real employee data. Emails only send when Resend is configured.
