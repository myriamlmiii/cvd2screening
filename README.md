# CVD 2.0 — U-Investors dashboard

An MVP dashboard over the **SITUATIONS** Airtable base: the deal
`PIPELINE` (247 sourced companies) and the `PORTFOLIO` (current
investments) — plus three AI-screening views (Scorecard, Priority
board, Deal review) over the same real pipeline, scored by the
Python pipeline in `/backend`. Every screen reads real Airtable data;
nothing here is mock.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build && npm run start    # production
```

Requires Node 20+. Nothing else is needed to start — the app ships
with a data snapshot at `data/airtable-snapshot.json` and runs fully
offline. Overview / Pipeline / Portfolio work immediately; the three
**Screening** views (`/screening/*`) also work immediately, they'll
just show every deal as "Not scored" until Supabase is wired up (see
below) and the backend pipeline has run at least once.

## Live Airtable data

To serve live data instead of the snapshot:

1. Create a Personal Access Token at
   <https://airtable.com/create/tokens> with scope
   `data.records:read` and access to the SITUATIONS base.
2. `cp .env.local.example .env.local` and set `AIRTABLE_TOKEN=...`
3. Restart `npm run dev`. The top bar shows **Live** instead of
   **Snapshot**; data revalidates every 5 minutes.

Refresh the committed snapshot from Airtable at any time:

```bash
npm run sync
```

## AI scores (Supabase)

The three `/screening/*` views read AI scores from Supabase, joined
onto the real Airtable rows by record id — the frontend never talks
to Groq or runs scoring itself.

1. Create a free project at <https://supabase.com>.
2. Open the SQL editor and run `supabase/schema.sql` against it —
   this creates the one table the dashboard reads, `scored_deals`.
3. In `.env.local`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   (Project Settings → API — use the **anon** key here, it's
   read-only).
4. Run the backend pipeline against the same Supabase project (see
   `backend/README.md`) to populate `scored_deals`. Restart
   `npm run dev` — scores start showing up (revalidates every 60s
   after that).

Until step 4 has run at least once, the screening views are fully
functional with real Airtable data — every score cell just reads
"Not scored" rather than showing anything fabricated.

## Live decisions & realtime (Priority board)

The Priority board lets a GP bulk-select cards and apply a decision
(Advance / Hold / Pass), with a physical Undo. This is the one place
the frontend writes to Supabase — everything else stays read-only.

1. In `.env.local`, set `SUPABASE_SERVICE_ROLE_KEY` (Project Settings
   → API → `service_role`). Server-only — it's read by
   `app/api/decisions/route.ts` and never sent to the browser. Without
   it, decision buttons show an inline error and nothing writes.
2. Also set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   — the same values as `SUPABASE_URL` / `SUPABASE_ANON_KEY`, just
   exposed to the browser so it can open a realtime subscription to
   `scored_deals` (read-only; the table is already public-select).
   Without these two, the board still works, it just won't live-refresh
   when someone else applies a decision.

## What maps from Airtable

| Screen | Table | Shows |
|--------|-------|-------|
| Overview | PIPELINE + PORTFOLIO | counts, sector / geography / status / source breakdown, deals added per month, recent additions |
| Pipeline | PIPELINE | every company — search + filter by sector, country, status; sortable; click through to detail |
| Pipeline detail | PIPELINE | description, running notes, deal terms, founder contact, all linked documents |
| Portfolio | PORTFOLIO | investments, CVD deployed, ownership, runway |
| Portfolio detail | PORTFOLIO | situation, negotiation outcome, financials, ownership split, documents |
| Screening → Scorecard | PIPELINE + Supabase `scored_deals` | every company as a row, AI score / flags / recommendation as computed columns |
| Screening → Priority board | PIPELINE + Supabase `scored_deals` | companies grouped by screening stage (New / Screening / Priority review / Decided) |
| Screening → Deal review | PIPELINE + Supabase `scored_deals` | portfolio-level stats, ask-size and sector charts, ranked deal cards |

Empty cells (blank or `N/A` in Airtable) render as `—`; empty document
links are hidden. The three Screening views are three different
arrangements of the *same* real, scored data — not three different
datasets — so any deal looks up the identical score everywhere.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Recharts · Lucide · Supabase (Postgres, REST for reads/writes;
`@supabase/supabase-js` only for the Priority board's realtime
subscription — everything else stays on plain `fetch`).

```
app/(app)/          routed screens + shell layout
  screening/         Scorecard, Priority board, Deal review
components/
  shell/            sidebar, top bar
  ui/               Panel, StatGrid, BarList, DetailField, FilterBar, …
  charts/           Recharts wrappers
  pipeline/         PipelineExplorer (search / filter / sort table)
  screening/        RecommendationTag
data/
  airtable-snapshot.json   committed data snapshot
lib/airtable.ts     live API + snapshot fallback, normalisation, helpers
lib/supabase.ts     scored_deals read (anon key), never fabricates a score
lib/screening.ts    merges PipelineDeal + DealScore into ScoredDeal
scripts/sync-airtable.mjs  regenerate the snapshot from Airtable
supabase/schema.sql  the one table the dashboard reads
types/index.ts      PipelineDeal, PortfolioCompany, Snapshot, DealScore, ScoredDeal
```

## Backend

`/backend` is the Python sourcing/screening pipeline — Airtable →
qualify → enrich → score (Groq) → write back to Airtable + push to
Supabase. See `backend/README.md` for how to run it. This dashboard
never calls Groq from the browser or Airtable's write API itself; it only reads.

## Deploy to Vercel

Not done as part of this build — run locally first. When you're
ready:

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In Vercel: **New Project** → import the repo. Framework preset
   (Next.js) is auto-detected; leave build/output settings as
   default.
3. **Important**: set the **root directory** to the repo root that
   contains `package.json` (the folder this README is in) — not
   `/backend`, which is a separate Python project Vercel should
   ignore.
4. Add environment variables under Project Settings → Environment
   Variables (Production + Preview):
   - `AIRTABLE_TOKEN` — optional; without it the app serves the
     committed snapshot.
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` — optional; without them
     Screening views show "Not scored" everywhere.
5. Deploy. The backend pipeline keeps running wherever you run it
   today (locally, cron, GitHub Actions) — it isn't part of the
   Vercel deployment; Vercel only serves the dashboard, reading
   Airtable + Supabase over the network.
