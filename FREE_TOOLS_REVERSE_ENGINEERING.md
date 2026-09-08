# Free Tools — Reverse Engineering

Inspection of `naano.com/free-tools` and all five tools, 2026-09-08. Companion to
[REVERSE_ENGINEERING.md](REVERSE_ENGINEERING.md); same method and same honesty about
what was observed versus inferred.

**The headline finding: almost nothing here had to be inferred.** Naano publishes the
exact arithmetic behind three of the four calculators, and the full benchmark tables
behind the other. Every formula and every table below is quoted from their own pages,
not reconstructed from probing inputs. That makes these tools reproducible to the digit
rather than approximated — the interesting work moves from "guess the model" to "build
the experience around a known model."

---

## Page-level structure

`/free-tools` is an index: eyebrow, H1, one-line promise, then five tool cards. Each
card carries a `Free` badge, title, one-line benefit, a paragraph, a differentiator
line, a `Free · <turnaround> · No account needed` meta strip, and an **Open the tool**
link. Below: a "More tools coming" note, an FAQ accordion, and a "Keep reading" list.

Every tool page follows one template:

1. Breadcrumb back to Free Tools
2. H1 with a trailing full stop (`LinkedIn Creator Worth Calculator.`) — a consistent
   typographic tic across the whole site
3. Intro paragraph, always ending with a privacy claim: *"Free, no account, nothing
   leaves your browser."*
4. Two-column: inputs left, live result right
5. **Method section** — the formula, fully disclosed
6. FAQ accordion
7. "More free tools" cross-links (3 cards)
8. Two CTA panels: one for creators, one for companies
9. Footer

The result panel is **live** — no submit button. It shows placeholder guidance until
inputs are valid, then swaps to the result in place.

---

## Tool 1 — Free LinkedIn Creator Search (`/selection`)

**This one is not a calculator, and that matters.** It is a lead-capture form. A human
at Naano builds the shortlist and emails it within 48 hours. They lean on this
deliberately: *"Hand-picked by a real human, not an algorithm"*, and the FAQ says it
takes hours rather than seconds *because* a person does it.

Observed inputs: company name, website (optional), work email, goal
(**Generate leads** / **Build awareness** / **Launch a product**), exact creator budget
(currency-prefixed number with a €2,500 – €50,000 slider, default €10,000), and a free-text
"Who do you want to reach?".

Four numbered steps: describe → a human searches → receive shortlist → book or walk away.

**What is reproducible:** the form, its validation, the goal/budget/audience inputs.
**What is not:** the human research, and the wider-LinkedIn sourcing beyond their own
marketplace.

**Decision:** rebuild it as an **instant local matcher** over our existing 24-creator
dataset, and say so in the UI. Reproducing a 48-hour email handoff would give a reviewer
a form that does nothing. An instant ranked shortlist demonstrates the scoring
engineering the original hides behind a human — and the UI states plainly that it is a
local demo dataset, not live LinkedIn data.

---

## Tool 2 — LinkedIn Creator Worth Calculator

**Inputs:** follower count · average reactions per post · average comments per post ·
posts per week (1–7 select) · niche (B2B SaaS/Tech, Sales/Marketing, Finance,
HR/Future of work, Other).

**Formula — quoted verbatim from their method section:**

| Step | Rule |
|---|---|
| Engagement rate | `(reactions + 2 × comments) ÷ followers` — comments weighted double |
| Base value | `€12 per 1,000 followers`, floor **€100** |
| Engagement adjustment | `base × (0.6 + engagementRate ÷ 2.5)`, capped at **×2** |
| Niche multiplier | SaaS/Tech ×1.2 · Finance ×1.15 · Sales/Marketing ×1.1 · HR ×1.0 · Other ×0.9 |
| Range | ±20%, rounded to nearest €10, never below €100 |
| Monthly potential | 2–4 sponsored posts per month |

**Engagement bands:** ≥4% excellent · 2–4% good · 1–2% average · <1% low.

Note `postsPerWeek` is collected but does not appear anywhere in the disclosed formula —
it feeds the monthly-potential framing at most. Worth reproducing as an input since it
shapes the recommendation copy.

---

## Tool 3 — LinkedIn Engagement Rate Calculator

**Inputs:** followers · avg reactions · avg comments · avg reposts · avg impressions
(optional, from LinkedIn analytics).

**Formulas — both disclosed:**

- By followers: `(reactions + comments + reposts) / followers × 100`
- By impressions: `(reactions + comments + reposts) / impressions × 100`

Note this differs from the Worth calculator, which double-weights comments. Same brand,
two different engagement definitions, used for different jobs — worth preserving rather
than unifying, because unifying them would break agreement with their published numbers.

**Benchmark tiers, published in full:**

| Follower tier | Good rate | Meaning |
|---|---|---|
| Under 2,000 | 5 – 8% | Small warm audiences; above 8% is exceptional |
| 2,000 – 5,000 | 4 – 6% | Sweet spot for B2B micro-creators |
| 5,000 – 20,000 | 2.5 – 4% | Dilutes as audience broadens |
| 20,000 – 50,000 | 1.5 – 2.5% | Depth traded for distribution |
| 50,000+ | 1 – 1.5% | 1%+ at scale is still serious reach |

Verdicts: above range → **Excellent**, inside → **Healthy**, below → **Below benchmark**.

Impressions are optional, so the by-impressions rate needs a local estimator when absent.

---

## Tool 4 — Sponsored Post Delivery Odds Estimator

**Inputs:** creator audience size (5 bands) · offer per post (€).

**Delivery table, published in full:**

| Price band | Bookings | Published | Never answered |
|---|---|---|---|
| Under €200 | 142 | 30.4% | 41.6% |
| €200 – €399 | 70 | 25.9% | 40.9% |
| €400 – €599 | 36 | 34.6% | 25.0% |
| €600+ | 52 | 64.6% | 19.2% |

**Transacted price table, published in full:**

| Audience | n | P25 | Median | P75 |
|---|---|---|---|---|
| Under 5,000 | 66 | €56 | €84 | €120 |
| 5,000 – 10,000 | 64 | €88 | €180 | €423 |
| 10,000 – 25,000 | 118 | €122 | €300 | €360 |
| 25,000 – 50,000 | 36 | €345 | €588 | €606 |
| 50,000+ | 16 | €499 | €720 | €900 |

**A discrepancy worth recording:** the `/free-tools` index and the marketplace page both
say **239 bookings, 14 June – 1 August**. The two tool pages themselves say **n=300,
14 June – 11 August**. The index copy is stale against the tools. The brief I was given
also says 239. I am building my own labelled dataset regardless, so this is a note about
their content maintenance, not a blocker.

The method section is unusually candid, and it is the best thing on the page: it states
the relationship is **correlational, not causal**; flags the €400–€599 band as
directional (9 buying brands); and discloses that the €600+ delivery rate *fell from
80.6% to 64.6%* between two snapshots. That intellectual honesty is worth reproducing —
it is a genuine product decision, not decoration.

---

## Tool 5 — Creator Campaign Budget Planner

**Inputs:** campaign budget (€) · your own price per post (€, optional).

**Chain:** `budget ÷ median price = posts booked` → `booked × delivery rate = published`
→ `budget ÷ published = true cost per published post`.

**Three preset allocations, published:**

| Allocation | Tier | Median | Band | Published |
|---|---|---|---|---|
| Spread | Under 5,000 | €84 | Under €200 | 30.4% |
| Mid-tier | 10,000 – 25,000 | €300 | €200 – €399 | 25.9% |
| Concentrated | 50,000+ | €720 | €600+ | 64.6% |

The band is **derived from the price**, so a preset and a custom price of the same value
agree — a detail worth copying, because getting it wrong makes the tool contradict itself.

Their own worked example: €5,000 books 59 posts at €84, historically ~18 published.
Their stated conclusion: many small creators wins — roughly €280 per published post
versus €1,100–1,300 for the upper allocations. Timing: median 8.0 days booking→published,
P90 14.1 days, acceptance in a median of 35 minutes.

---

## Private data vs. reproducible

| Reproducible in full | Depends on their private data / people |
|---|---|
| All four calculator formulas (disclosed) | The underlying booking records themselves |
| All benchmark and price tables (published) | Live re-querying of the marketplace DB |
| Every input, validation and result structure | Human-built shortlists in the creator search |
| Page layout, FAQ, CTA structure | Sourcing across the wider LinkedIn ecosystem |
| Delivery/price band lookups | Snapshot-over-time movement between dates |

**How I handle the gap:** benchmark tables are re-derived into our own clearly-labelled
local dataset with our own numbers in the same shape — not copied and passed off as
theirs, and not fabricated as "real bookings". Every tool states its dataset is
illustrative. The creator search runs instantly against our 24-creator marketplace
dataset instead of a 48-hour human process.

---

## Build decisions

- **Reuse, do not duplicate.** The main build already has 24 creators with audience
  composition, topics, pricing and engagement, plus a relational match scorer
  (`lib/match.ts`). Creator Search extends that with budget compatibility rather than
  introducing a second creator dataset.
- **The brief mentions Framer Motion.** The main build deliberately has none — reveals
  and count-ups are hand-rolled hooks (`lib/hooks/use-motion.ts`) precisely to avoid the
  dependency. The tools reuse `Reveal` and `Counter`, so the motion language matches
  without adding a library.
- **Two engagement formulas stay separate**, matching the original, because collapsing
  them would break agreement with their published benchmarks.
- **Calculators live in `lib/calculators/`** as pure functions with no React import, so
  they are independently testable and the UI holds no arithmetic.
- **Placement:** `/free-tools` is public marketing, so it uses `SiteNav`/`SiteFooter`
  like the landing page, not the signed-in `AppShell`.
