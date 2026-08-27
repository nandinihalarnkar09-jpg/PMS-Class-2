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

Roles live in Postgres as one of **`employee`**, **`manager`**, **`hr_admin`**. Org hierarchy is still `employees.manager_id` (not a managers table). Every read and write that touches another person’s file is checked on the server; changing a URL as an employee returns **not found**.

## Domain model

| Table | Holds |
| --- | --- |
| `employees` | People, including `manager_id` (self-reference) |
| `review_cycles` | Appraisal window |
| `goals` | **Plan** — title, description, success criteria, weight |
| `reviews` | **Outcome packet** — narrative, status, calibrated `final_rating` |
| `goal_ratings` | **Outcome per goal** — self / manager / final scores on a review |

Never mix plan and outcome: progress bars do not live on `goals`.

## Features

- People directory (~200 colleagues) with manager chain and utilization
- Weighted **goal plans** for FY 2025–26
- Review packet with **goal_ratings** (self → manager → HR calibration → acknowledge)
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
| `employee@helix.consulting` | employee | Diya Patel |
| `manager@helix.consulting` | manager | Rohan Desai |
| `hr@helix.consulting` | hr_admin | Ananya Iyer |
| `admin@helix.consulting` | hr_admin | Kabir Shah |
| `ceo@helix.consulting` | hr_admin | Leela Menon |

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
