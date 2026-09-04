# U-Investors — Deal Screening System

Frontend prototypes for the AI-assisted deal screening pipeline discussed with
Driss Laraki: pull startup submissions from Airtable, enrich them with an
LLM (summary, score, flags, sector fit), and surface the result as something
he can scan in minutes, not comb through in Airtable.

This first pass is **frontend only** — static mockups with placeholder data,
built to show three different shapes the output could take before any
backend/API work starts. No live Airtable or LLM connection yet.

## What's here

- `frontend/proposition-a-scorecard.html` — a dense, Airtable-grid-style
  table view. Closest to "Airtable but smarter": every deal as a row, AI
  score / sector fit / flags as computed columns. Best if Laraki wants to
  stay inside something that feels like the tool he already uses.
- `frontend/proposition-b-priority-board.html` — an Airtable-style board
  grouped by screening stage (New → Screening → Priority Review → Decided).
  Best if the bottleneck is prioritization — "what do I look at first" —
  rather than data density.
- `frontend/custom-dashboard.html` — a standalone app view, not styled after
  Airtable at all: portfolio-level stats up top, then a scannable grid of
  deal cards with mini insight charts. Best long-term "output surface" if
  the goal is Laraki opening one link and deciding, per the original brief.

All three use the same 8 mock startups so they're directly comparable.

## Next steps (not yet built)

- Backend pipeline: Airtable API → normalization → LLM enrichment → write
  back (see architecture options discussed separately — batch pipeline is
  the recommended v1).
- Real schema from U-Investors' Airtable base.
- Decide which of the three output shapes (or a hybrid) to build against.

## Opening this in VS Code / Claude Code

Each HTML file is self-contained (inline CSS/JS, fonts and charts loaded
from CDN) — just open any file directly in a browser to preview, no build
step needed. Once a direction is picked, Claude Code can take this repo and
wire up the real data layer.
