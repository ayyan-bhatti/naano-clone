# Vouch — a re-engineering of Naano

A working rebuild of [naano.com](https://naano.com), a B2B LinkedIn creator
marketplace, built as a 24-hour engineering assessment.

Not a visual clone. The product was reverse-engineered first
([REVERSE_ENGINEERING.md](REVERSE_ENGINEERING.md)), then rebuilt under its own
identity, with the flows that make it a product — audience-fit matching, briefing,
campaign management, per-post attribution and payouts — actually working.

---

## Overview

Naano's thesis is that on LinkedIn, organic reach lives on personal accounts, not
company pages. So the channel a B2B brand wants is other people's credibility,
bought per post at a fixed price, with attribution attached. Two commitments
follow from that, and both are reproduced here:

- **Fixed price per post**, set by the creator, visible before booking. Never CPC or CPL.
- **Audience fit over follower count.** The marketplace ranks on a match score, not reach.

The rebuild takes the second one further than the original does: Naano shows a
bare `MATCHING 97/100`, and Vouch shows the same score **broken down by factor**,
with the reasoning for each. That is the single change I would most argue for if
this were a real product decision.

## Features

**Company / brand flow** — the primary build:

- Landing page with live marketplace preview ranked by the real match function
- Role-first signup, demo sign-in, and a one-click seeded demo workspace
- Onboarding that collects the buyer profile the match score depends on
- **Marketplace** — search, six filter groups with live counts, five sort modes,
  persisted shortlist, multi-select straight into a campaign. Public, no login.
- **Creator profiles** — stats, audience composition, recent posts, availability,
  fixed price, and the match-score breakdown. All 24 prerendered.
- **Campaign creation** — four steps, per-step validation, live budget tracking,
  and a brief generated from your inputs and your chosen creators
- **Campaign management** — draft → scheduled → live → completed, per-creator
  accept/publish, per-creator performance, payout states
- **Working tracked links** — `/l/[code]` resolves to a campaign, attributes the
  click to the creator whose variant was used, records a real event (timestamp,
  referrer, device), and the campaign and dashboard totals move because they read
  those rows. Not a simulation.
- **Dashboard** — pipeline, impressions, clicks, leads, spend, trend chart
- **Payouts** — read-only ledger across every campaign
- **Settings** — edit the buyer profile and watch the marketplace re-rank

**Creator flow** — secondary, deliberately narrower:

- Overview with earnings, active collaborations and post views
- Deals with **accept / decline** on inbound offers
- Earnings ledger

**Free tools** — five public calculators, no account, all working:

| Tool | What it does |
|---|---|
| [Creator Search](/free-tools/creator-search) | Free-text brief → ranked shortlist with fit score, price and a reason per creator |
| [Creator Worth](/free-tools/creator-worth) | Followers + engagement + niche → per-post fee range, with every step shown |
| [Engagement Rate](/free-tools/engagement-rate) | Rate by followers and by impressions, against size-scaled benchmarks |
| [Delivery Odds](/free-tools/delivery-odds) | Offer + audience size → publication odds and price positioning |
| [Campaign Budget](/free-tools/campaign-budget) | Budget → booked → **published** → true cost per published post |

Calculators are pure functions in `lib/calculators/` with no React import, covered by
`npm run test:calculators` — 1061 assertions across normal, zero, empty, negative,
decimal and extreme inputs, asserting no NaN or non-finite value can reach the UI, plus
determinism on repeat runs. Benchmark tables live in `lib/data/benchmarks.ts` as a
clearly-labelled reference set of our own; every tool page says so.

The one place this departs from the original: Naano's creator search is a form that a
human answers by email within 48 hours. Reproducing that would give a reviewer a form
that does nothing, so ours runs the match instantly against the demo marketplace using
the *same* scorer as `/marketplace` — and the page states plainly that it is a local
dataset, not live LinkedIn data.

## Tech stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4, tokens in `app/globals.css` |
| Icons | Lucide |
| State | React context + `localStorage` |
| Charts | Hand-rolled SVG |
| Animation | Hand-rolled hooks (IntersectionObserver + rAF) |

Six runtime dependencies: `next`, `react`, `react-dom`, `lucide-react`, `clsx`,
`tailwind-merge`.

**No charting or animation library.** Recharts would have added ~150KB to draw an
area chart and a sparkline; Framer Motion would have added more to do scroll
reveals and count-ups. Both are ~100 lines of SVG and two hooks. Shared JS is
**103KB**, and every animation respects `prefers-reduced-motion` at the hook
level rather than just in CSS.

## Architecture

```
app/                       routes (App Router)
  page.tsx                 landing
  free-tools/              index + five calculators
  marketplace/             public creator directory + route-level loading UI
  creators/[slug]/         prerendered profiles (SSG) + client island
  campaigns/               list, new (4-step), [id] detail
  dashboard/               role-aware: brand or creator overview
  deals/ earnings/         creator surfaces
  payouts/ settings/       brand surfaces
components/
  ui/                      button, card, field, feedback, chart, status, …
  creator-card.tsx         the marketplace card
  app-shell.tsx            signed-in chrome + RequireAuth guard
lib/
  calculators/             five pure calculators, no React
  data/benchmarks.ts       benchmark tables (our own labelled set)
  types.ts                 the domain
  data/creators.ts         24 hand-authored creators, derived stats
  data/campaigns.ts        5 seeded campaigns across every status
  match.ts                 relational audience-fit scoring
  metrics.ts               performance simulation + aggregation
  brief.ts                 local brief generation
  store.tsx                all state; the single persistence boundary
```

Two decisions carry most of the weight:

**Metrics are never stored loose.** A campaign's totals are always summed from
its collaborations, and each collaboration's performance is derived from that
creator's real reach and engagement. The dashboard, the campaign page and the
per-creator table therefore cannot disagree, and adding a creator to a live
campaign moves every number downstream.

**Everything derived is deterministic.** Stats, audience splits, recent posts and
performance are hashed from stable ids rather than `Math.random()`, so server and
client agree (no hydration mismatch), and charts do not reshuffle between renders.

## Demo

Two entry points, deliberately:

1. **Demo workspace** — `/sign-in` → *Open the demo workspace*. Lands on a
   populated dashboard: 5 campaigns across every status, a shortlist, and real
   attribution data.
2. **Fresh account** — `/sign-up` → pick a role. A brand account starts genuinely
   **empty**, so the empty states are visible rather than hidden behind seed data.
   A creator account arrives with inbound deals to accept.

The demo workspace needs no credentials at all. If you sign up instead, you set a real
password — hashed with SHA-256 via the built-in Web Crypto API and verified on sign-in,
so the field is not decorative. It is still demo auth, not authentication.

Worth clicking, in order:

1. `/marketplace` → filter to *Under €150* and sort by **Best match**
2. Open a creator → read the **Audience match** breakdown in the sidebar
3. Shortlist two or three, then select them and hit **Create campaign**
4. Step through the four steps; the brief on step 4 changes with your shortlist
5. On the campaign, hit **Launch** → creators publish, metrics appear, the chart
   fills, and the dashboard totals move
6. `/settings` → change your buyer personas → `/marketplace` is re-ranked

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run build        # production build
npm run start        # serve the build
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
npm run test:calculators # 1061 assertions over the pure calculators
npm run test:tracking    # 14 browser assertions that tracked links record events
npm run qa               # visual + behavioural QA vs naano.com (needs Playwright)
```

Node 20+. No `.env` file, no API keys, nothing to configure.

## Deployment

Static-first: 37 routes, of which all but `/campaigns/[id]` are prerendered at
build time. Deploys to any Node or static-capable host with zero configuration
and zero environment variables.

```bash
npx vercel --prod
```

Because there are no server secrets and no external services, there is no
staging/production configuration split and nothing that can expire.

## Product decisions

**Built the brand side first, and most.** It is the richer loop and the one that
demonstrates product thinking: discovery → brief → management → attribution →
payout. The creator side is three screens, and I would rather it be obviously
narrower than uniformly thin.

**No external APIs, at all.** No auth provider, no database, no payment
processor, no model API. A demo that cannot break because a key expired or a
third party is down is worth more than one with a real integration that fails
during review. The state layer (`lib/store.tsx`) is the only persistence
boundary, so swapping `localStorage` for a real API is a contained change.

**The brief generator is labelled "Assisted", not "AI".** Naano markets this step
as AI. Here it is deterministic local template assembly that reads the objective,
the audience, the key message and the topics your chosen creators actually cover.
It genuinely responds to its inputs — but calling it AI when no model runs would
be a lie, so it is not called that.

**Empty states are real.** A new brand account has no campaigns. That is a
deliberate product surface, not an oversight, and seeding it would have hidden
work I wanted visible.

**Restraint on motion.** Scroll reveals are 260ms and 8px. Counters animate once
on first view. There is no parallax, no glassmorphism and no gradient mesh beyond
one soft aurora band. The interaction that got the most attention is the hover
state on a creator card, which surfaces availability and engagement without a
navigation — because scanning a grid of 24 is the actual job on that screen.

## Limitations

Everything here is honest about being a demo:

- **Auth is not authentication.** A name and email in `localStorage`. No password,
  no session token, no server. `RequireAuth` is a client-side redirect and
  protects nothing — it makes the app coherent, not secure.
- **Data is per-browser.** Clearing site data resets everything. A campaign
  created in one browser does not exist in another. `/campaigns/[id]` handles
  this with a real not-found state rather than a crash.
- **Creators are fictional.** Names, bios and posts are written for this build.
  Stats are derived deterministically, anchored to the price bands Naano
  publishes (median €84 under 5K followers, €180 at 5–10K, €312 at 10–25K).
- **Metrics are part observed, part simulated.** Clicks you generate through a
  tracked link are **real events** with a real timestamp, referrer and device, and
  the UI breaks them out as live. The historical baseline underneath them is
  simulated from each creator's reach and engagement with a realistic CTR curve —
  smaller audiences click harder, which is the product's own claim. Visitor
  company and role on a click are inferred, and labelled as inferred.
- **Payments are represented, not processed.** The ledger moves through pending →
  scheduled → paid. No money exists.
- **Not reproduced:** LinkedIn integration, real payments, the agency side,
  messaging, blog and SEO pages, the free-tool calculators, the managed-campaigns
  sales funnel, multi-language. Reasons for each are in
  [REVERSE_ENGINEERING.md](REVERSE_ENGINEERING.md) §11 — all scope, not difficulty.

## What I would build next

1. **Content submission → review → approve.** A creator can be approved, but cannot
   yet submit a draft. Approval is what releases payment, so this completes the
   collaboration lifecycle.
2. Brief editing after generation, and per-creator brief variants.
3. Campaign-level comparison: which creator actually returned the most pipeline
   per euro, ranked.
4. Server persistence behind the existing store interface, so two browsers share
   a workspace.

---

Reverse-engineering notes: [REVERSE_ENGINEERING.md](REVERSE_ENGINEERING.md) ·
Walkthrough: [DEMO_SCRIPT.md](DEMO_SCRIPT.md) ·
Agent capture: [CAPTURE-TEST.md](CAPTURE-TEST.md)
