# Functionality gap — Vouch vs. naano.com

Audited 2026-09-08 by walking the live product with Playwright
(`scripts/feature-audit.mjs`, raw output in `research/naano-feature-audit.json`).
Every row below is observed, not recalled.

Legend: **✅ built** · **⚠️ partial or represented-only** · **❌ not built**

---

## 1. The headline gap — now closed

> **✅ Tracked links record real events.** *(closed 2026-09-08)*

The audit found one gap that mattered more than all the others: every campaign
displayed `vouch.link/<code>`, but nothing resolved it and no click was ever
recorded. The product's central claim — "trace the clicks, leads and pipeline
back to every post" — was the one surface that looked like it did something it
did not.

It now works. `/l/[code]` resolves the code to a campaign, attributes the click
to the creator whose variant was used, writes an event with a real timestamp,
referrer and device, and the campaign and dashboard totals move because they
read those rows. Verified end to end by `npm run test:tracking` — 14 assertions
in a real browser.

What is observed: timestamp, referrer, device, creator attribution.
What is inferred and labelled as such: visitor company and role.

---

## 2. Core product loop — what we have

| Capability | Status | Notes |
|---|---|---|
| Company landing | ✅ | Live marketplace preview, ranked by the real scorer |
| Role-split signup | ✅ | Matches their fork-on-role-first structure |
| Email + password auth | ✅ | SHA-256 via Web Crypto, verified on sign-in |
| Buyer-profile onboarding | ✅ | Feeds the match score; not a formality screen |
| Creator marketplace | ✅ | Search, 6 filter groups, 5 sorts, live counts |
| Public creator directory | ✅ | 24 profiles, prerendered, no login |
| Match / fit scoring | ✅ | **Better than theirs** — broken down by factor, they show a bare number |
| Shortlist / favourites | ✅ | Persisted, shared across marketplace and tools |
| Multi-select → campaign | ✅ | Selection bar with running cost |
| Campaign creation | ✅ | 4 steps, per-step validation, live budget tracking |
| Brief generation | ✅ | Local, deterministic, labelled "Assisted" not "AI" |
| Campaign statuses | ✅ | draft → scheduled → live → completed, with side effects |
| Per-creator collaboration states | ✅ | invited / accepted / in review / published / declined |
| Attribution dashboard | ✅ | Simulated history **plus real recorded clicks**, broken out separately |
| Draft submission → review → approve | ✅ | Approval publishes the post and schedules the fee; revisions are append-only |
| Brand ↔ creator messaging | ✅ | Threaded per collaboration; generated replies are labelled as generated |
| Creator profile editing | ✅ | Claims are editable, measurements are not — and the page says why |
| Creator media kit | ✅ | **Not in their product.** One printable page, via the browser's own print-to-PDF |
| Creator payout method | ✅ | Only the last four characters are stored |
| Dedicated pricing page | ✅ | **Better than theirs** — publishes the price index and delivery rate by band |
| Payout ledger | ✅ | Read-only, pending → scheduled → paid |
| Creator dashboard | ✅ | Earnings, collaborations, post views |
| Creator accept/decline | ✅ | The one interaction that genuinely belongs to that side |
| Creator earnings | ✅ | |
| Notifications | ✅ | In-app only |
| Settings / buyer profile edit | ✅ | Editing it visibly re-ranks the marketplace |
| Free tools | ✅ | All 5. Ours **compute**; their creator search is a 48h email |

## 3. Their features we have not built

### 3a. Worth building — all now built

| Gap | Status | What closed it |
|---|---|---|
| **Content submission → review → approve** | ✅ *(2026-09-08)* | Creator submits copy, brand approves or sends it back with written feedback. Approval is what publishes the post and schedules the fee. Revisions are append-only. |
| **Dedicated `/pricing` page** | ✅ *(2026-09-08)* | Publishes the transacted price index by audience size and the delivery rate by price band — including the band where paying more bought less. |
| **Messaging between brand and creator** | ✅ *(2026-09-08)* | Threads keyed by collaboration, not by person. Counterpart replies are generated locally and labelled as generated. |
| **Creator profile editing / media kit** | ✅ *(2026-09-08)* | Editable: headline, bio, positioning, topics, fee, availability. Not editable: followers, engagement, median views — those are measurements. Plus a printable media kit. |
| **Payout method setup** (creator side) | ✅ *(2026-09-08)* | `/payments`. Only the last four characters of an account are stored. |

### 3b. Deliberately cut — scope, not difficulty

| Gap | Why cut |
|---|---|
| Blog + ~50 posts, `/for/*` verticals, SEO pillars | Content marketing, not product |
| `/agencies` + agency workspace switcher | A third role; largely the brand app with a client selector |
| `/about`, `/help`, `/privacy`, `/terms` | Static marketing/legal |
| `/reports`, `/benchmarks/*` | Data-publishing surface, not the app |
| `/book` sales-call funnel | Sales motion, not product |
| Multi-language (EN/FR) | Real for their EU market; pure cost here |
| `llms.txt`, `pricing.md` | AI-agent affordances, nice but peripheral |
| Case studies | Marketing |

### 3c. Cut because of the no-external-API constraint

| Gap | Why |
|---|---|
| LinkedIn / Google OAuth | External auth provider |
| Real LinkedIn analytics connection | LinkedIn API |
| Stripe Connect payouts | Payment processor |
| Email delivery (verification, password reset, magic link) | Email service |
| Contract / invoice generation | Document + storage service |
| Team accounts, multi-user workspaces | Needs a real backend to be meaningful |

## 4. Smaller deltas found in the audit

Observed on their `/register?role=saas` after clicking *Sign up with email*:

- They split **First name / Last name**; we use a single Full name. Trivial, but theirs is what a CRM expects.
- They ask **"How did you hear about us?"** (LinkedIn / Word of mouth / Google search / A creator / Other). An attribution question at signup — cheap to add and good product instinct.
- They offer **OAuth alongside email**; we are email-only by constraint.
- Their **login** is email + password only, same as ours.

## 5. Where this leaves it

Everything in §3a is built. What remains uncut is in §3b and §3c, and both
lists are correct as they stand: §3b is content and sales surface rather than
product, and §3c is blocked by the no-external-API constraint rather than by
time.

Verified by:

| Suite | Covers | Result |
|---|---|---|
| `npm run test:calculators` | The five free tools, incl. degenerate inputs | 1061/1061 |
| `npm run test:collaboration` | Draft state machine, thread identity, unread counting, seeded history | 79/79 |
| `npm run test:tracking` | Tracked links recording real events, in a browser | 14/14 |
| `npm run test:review` | Submit → review → approve end to end, plus messaging | 48/48 |
| `npm run qa` | 24 checks across 21 screenshots, desktop and mobile | 24/24 |
