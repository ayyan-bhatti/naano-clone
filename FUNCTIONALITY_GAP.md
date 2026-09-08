# Functionality gap — Vouch vs. naano.com

Audited 2026-09-08 by walking the live product with Playwright
(`scripts/feature-audit.mjs`, raw output in `research/naano-feature-audit.json`).
Every row below is observed, not recalled.

Legend: **✅ built** · **⚠️ partial or represented-only** · **❌ not built**

---

## 1. The honest headline

One gap matters more than all the others combined:

> **⚠️ Tracked links are displayed but do not track.**
> Every campaign shows `vouch.link/<code>`, the copy button works, and the
> attribution numbers are consistent — but no link is resolvable and no click is
> ever recorded. The dashboard reads a simulation, not events.

This is the product's central claim ("trace the clicks, leads and pipeline back
to every post") and it is the one place the build currently shows something it
does not do. Everything else on the ❌ list is honestly absent; this one is
present-looking. **It should be closed first** — see §5.

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
| Attribution dashboard | ⚠️ | Numbers are consistent and derived, but simulated — see §1 |
| Payout ledger | ✅ | Read-only, pending → scheduled → paid |
| Creator dashboard | ✅ | Earnings, collaborations, post views |
| Creator accept/decline | ✅ | The one interaction that genuinely belongs to that side |
| Creator earnings | ✅ | |
| Notifications | ✅ | In-app only |
| Settings / buyer profile edit | ✅ | Editing it visibly re-ranks the marketplace |
| Free tools | ✅ | All 5. Ours **compute**; their creator search is a 48h email |

## 3. Their features we have not built

### 3a. Worth building — real product surface

| Gap | Cost | Why it matters |
|---|---|---|
| **Working tracked links** (`/l/[code]` → redirect + log click) | ~2h | Closes §1. Turns attribution from simulated into observed. |
| **Content submission → review → approve** | ~2h | We have approve/publish, but a creator cannot *submit a draft*. Their flow has a review step, and approval is what releases payment. |
| **Dedicated `/pricing` page** | ~30m | They have one; we only have a landing section. |
| **Messaging between brand and creator** | ~4h | Visible in their in-app sidebar. Every real marketplace needs it. |
| **Creator profile editing / media kit** | ~2h | Creators cannot currently edit the profile brands see. |
| **Payout method setup** (creator side) | ~1h | Their creator nav has a Payments screen; ours has Earnings only. |

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

## 5. Recommended order

1. **Working tracked links.** `/l/[code]` route that resolves a campaign, records a click (timestamp, referrer, creator attribution) to the store, and redirects. Dashboard then reads real rows alongside the seeded ones. This is the highest-value change in the whole backlog: it removes the only dishonest surface and proves the product thesis.
2. **Content submission → review → approve.** Completes the collaboration lifecycle and makes approval-releases-payout real rather than a status flip.
3. **`/pricing` page.** Half an hour, closes an obvious structural gap.
4. Creator profile editing, then messaging, if time allows.

Everything below that line is correctly cut and should stay cut.
