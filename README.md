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
| In-app motion | Hand-rolled hooks (IntersectionObserver + rAF) |
| Marketing motion | GSAP + ScrollTrigger |

Nine runtime dependencies: `next`, `react`, `react-dom`, `lucide-react`, `clsx`,
`tailwind-merge`, `gsap`, and `@splinetool/react-spline` + `@splinetool/runtime`
for the auth robot.

**No charting library.** Recharts would have added ~150KB to draw an area chart
and a sparkline. Both are ~100 lines of SVG.

**Two animation layers, deliberately.** The product surfaces — dashboard,
marketplace, campaigns — use hand-rolled hooks: reveals and count-ups are an
IntersectionObserver and a rAF loop, and shipping a timeline engine to fade in a
stat card would be indefensible. The marketing pages use GSAP with ScrollTrigger,
because scrubbed scroll positions, masked line reveals and a pulse looping along
a rail are exactly the problem it exists to solve, and hand-rolling scroll
progress correctly is a much worse use of the bytes. GSAP is code-split to `/`
and `/pricing` and never reaches the app: shared JS is still **103KB**, and the
signed-in surfaces are unchanged.

Core and ScrollTrigger only — the formerly-Club plugins are free as of GSAP 3.13,
but text splitting and line drawing are hand-rolled in `lib/gsap.ts` so no
reviewer has to go and check that.

Every animation, in both layers, is gated on `prefers-reduced-motion` in
JavaScript rather than only in CSS: reduced motion means the setup callback never
runs and the final state renders, not a slower version of the same movement.
`npm run test:motion` asserts exactly that, along with the real failure mode of
scroll animation — an element that never arrives and leaves a blank section.

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
npm run test:calculators   # 1061 assertions over the pure calculators
npm run test:collaboration #   79 assertions over the review + messaging state machines
npm run test:assistant     #   95 assertions over the assistant's retrieval engine
npm run test:tracking      #   14 browser assertions that tracked links record events
npm run test:review        #   48 browser assertions: submit -> review -> approve, messaging
npm run test:motion        #   29 browser assertions that nothing is left invisible
npm run qa                 #   24 visual + behavioural checks vs naano.com
npm run qa:audit           #  436 checks: contrast, overflow, a11y, dead links
npm run qa:design          #  re-reads naano.com's computed design tokens
```

`qa:audit` is the full sweep: every route at desktop/tablet/mobile, WCAG
contrast measured against the real painted background, horizontal overflow,
tap-target sizes, unlabelled controls, duplicate ids, heading order, dead
internal links and console noise — across public, brand and creator sessions.

The browser suites need a production build running (`npm run build && npm run
start`). Playwright is a devDependency — it never ships, and keeping it in the
manifest stops every unrelated `npm install` from pruning it.

Node 20+. The app runs with no configuration at all; a `.env.local` is
optional and only turns on Stripe (see below). Copy `.env.example` if you want
it.

**One external runtime dependency.** The auth pages render a Spline scene from
`prod.spline.design`, which is the only thing in the build that needs the
network. It is layered rather than swapped in: the blue panel, the watching
crowd and the statement render immediately and are correct on their own, and
the 3D scene fades in over them only once it has actually loaded. Nothing
stands in for the robot in the meantime — an earlier build put a hand-drawn one
there and swapped it out on load, which read as two characters trading places.
So the page is right offline, under `prefers-reduced-motion`, and if Spline is
down. Setting `SPLINE_SCENE_URL` to `''` in `lib/spline.ts` drops it entirely.

## Deployment

Static-first: all but the tracked-link route and the four Stripe endpoints are
prerendered at build time. Deploys to any Node host with zero configuration.

```bash
npx vercel --prod
```

Environment variables are optional. With none set, the payment surfaces run in
represented mode and every other route is unaffected — which is a supported
state, not a degraded one, and the pages say which mode they are in.

| Variable | Required | What it does |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | no | Turns on Connect onboarding and real fee releases. Use a `sk_test_` key. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | no | Reserved for client-side Elements; nothing needs it yet. |
| `STRIPE_ALLOW_LIVE` | no | Must be `true` before the build will touch an `sk_live_` key at all. |
| `NEXT_PUBLIC_SITE_URL` | no | Absolute origin for Stripe redirects. Falls back to `VERCEL_URL`, then the request origin. |

`.env*` is gitignored and `.env.example` carries the names with no values.

## Payments

Stripe Connect, wired up properly rather than mimed — and gated so the build is
correct with no key at all.

**What is real.** A creator hits *Connect with Stripe* and is sent to Stripe's
own hosted onboarding, which collects the bank details and the identity
documents. This build never sees an IBAN and stores only the account id. The
onboarding state shown afterwards — payouts enabled, what Stripe is still
waiting on, the masked bank tail — is read back from the Stripe API on every
visit rather than cached, because those transitions happen on Stripe's side
while nobody is looking at the tab.

Releasing a fee from the brand's payout ledger creates a **destination charge**:
the platform takes the payment, Stripe splits it, `application_fee_amount`
stays with the platform and the remainder lands in the creator's connected
account. That is the call a production marketplace makes. The only stand-in is
the card — Stripe's shared `pm_card_visa` test token, because a demo has no
cardholder to collect from. Charges, fees and transfers all show up in the
Stripe dashboard.

**Three guards, all deliberate.**

- The build **refuses an `sk_live_` key** unless `STRIPE_ALLOW_LIVE=true`. A
  public demo that can charge a real card is a liability, not a feature.
- A missing key is a **supported state**, not an error. Every route answers
  "not configured" and the UI falls back to the represented flow it shipped
  with. Nothing 500s.
- A row only offers *Release* once that creator has actually finished
  onboarding. There is no destination without an onboarded account, so offering
  the action would be theatre.

**One demo-shaped compromise, named as such.** `PersistedState.connectedAccounts`
maps creator id → Stripe account id, because the brand side has to know where a
fee is going and cannot read the creator's own session. In a real product that
is a database table. Only the account reference is shared — never anything
behind it.

### Why there is no LinkedIn integration

Not a scope decision — the API cannot do what the product would need.

`memberFollowersCount` and `memberCreatorPostAnalytics` return data **only for
the authenticated member**. There is no endpoint that looks up an arbitrary
person's follower count, so a marketplace browsing 24 creators cannot be
fetching their stats on demand; naano's numbers must come from creators
connecting their own account and the results being cached. The seeded data here
stands in for that cache, not for a call I skipped.

Access is also gated behind the Marketing Developer Platform, which requires a
verified company page, an established product with real customers, and a 3–4
month review. *Sign In with LinkedIn* (OpenID Connect) is self-serve and free,
but returns name, photo and email only — nothing the marketplace needs.

## The assistant

A small robot in the corner of every page that answers questions about the
product and can navigate you around it.

There is no model behind it — this build ships with no external APIs and no
keys, so there is nothing to call. It is a retrieval engine over a hand-written
knowledge base: normalise the question, expand synonyms, score every entry by
weighted term overlap, return the best match with a confidence.

The interesting part is the threshold. Below it the engine says it does not
know and lists what it does cover, rather than returning the least-bad entry —
a retrieval bot that always answers is worse than one that admits a gap,
because you cannot tell the two apart until the answer is wrong.
`npm run test:assistant` asserts both directions: 36 real phrasings reach the
right entry, and six out-of-scope questions are refused.

It also reads the live store, so *"what is waiting on you"* is answered from
your actual campaigns — draft queue, unread messages, attributed pipeline —
rather than in the abstract.

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
- **Payments are real, in Stripe test mode — or represented, with no key set.**
  With `STRIPE_SECRET_KEY` configured, creator onboarding is Stripe-hosted
  Connect and releasing a fee is a genuine destination charge. Without it the
  ledger still moves through pending → scheduled → paid and no money exists.
  Both states are labelled on the page. Live mode is refused unless explicitly
  unlocked.
- **Not reproduced:** LinkedIn integration, the agency side,
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
