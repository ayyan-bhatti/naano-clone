# Naano — Reverse Engineering

Based on direct inspection of `naano.com` on 2026-09-07. Screenshots in
[research/screenshots/](research/screenshots/), numbered in flow order.

**Method and its limits.** The public surface was inspected in full: marketing pages,
the two-sided registration entry, pricing, the public creator directory
(`/creators/[slug]`), and the SEO marketplace page. The authenticated app was **not**
entered — creating an account on a live third-party product was out of scope for this
exercise. Two things made that far less costly than it sounds:

1. Naano ships a **public creator directory** with real profile pages, so the core
   marketplace entity is observable in production with real data.
2. The marketing site embeds **actual in-app UI screenshots** at full resolution
   (`/lp/marketplace-screenshot-clean-v2.png`, `/lp/dashboard-creator.webp`). These are
   the real product, not mockups, and they pin down card anatomy, sidebar structure,
   stat-card layout, table design and status semantics precisely.

Everything below is grounded in one of those. Where something is inferred rather than
observed, it says so.

---

## 1. Product purpose

Naano is a **B2B LinkedIn creator marketplace**. B2B SaaS companies find, book and pay
vetted LinkedIn creators for sponsored posts, and trace clicks, leads and pipeline back
to each individual post.

The strategic wedge, in their own framing: LinkedIn's organic reach concentrates on
*personal* accounts, not company pages. So the distribution channel a B2B brand actually
wants is other people's credibility — bought per post, at a fixed price, with attribution
attached.

Two structural commitments define the product:

- **Fixed price per post, set by the creator, shown before booking.** Explicitly not CPC,
  CPM or CPL. This is repeated on every page and is the core pricing primitive.
- **Audience fit over follower count.** "Matched to your buyers. Audience fit comes
  before follower count." The marketplace sorts on a match score, not reach.

## 2. Target users

- **Primary:** B2B SaaS marketing/growth teams selling to professional audiences.
  Vertical landing pages exist for sales-tech, revops, devtools, product, hr-tech,
  fintech, marketing-ops and vertical-saas.
- **Secondary:** LinkedIn creators (~1K–500K followers) monetising their audience.
  Positioned as salaried professionals who do not want to issue per-brand invoices.
- **Tertiary:** influence agencies managing client budgets (`/agencies`).

Geography: live in Europe, local-language creators — deliberately contrasted against
LinkedIn's own US/Canada-only alpha.

## 3. Main user roles

`/register` splits on role before anything else, via query param:

| Role | Param | Value proposition |
|---|---|---|
| Brand / company | `?role=saas` | "Find creators, launch campaigns, and trace real pipeline back to each post." |
| Creator | `?role=influencer` | "Get paid to create LinkedIn content for B2B brands you actually use." |
| Agency | — | Separate marketing page; same brand-side app, inferred. |

Role selection is step one of signup, not a setting buried later. Worth copying.

## 4. Important pages and routes

**Observed public:**

| Route | Purpose |
|---|---|
| `/` | Company-side landing |
| `/creators` | Creator-side landing |
| `/agencies` | Agency-side landing |
| `/register`, `/register?role=` | Role-split signup |
| `/login?reauth=1` | Sign in |
| `/creators/[slug]` | Public creator profile |
| `/pricing` | Self-Serve €0 vs Managed €700/mo |
| `/selection` | "Get a free creator shortlist" lead magnet |
| `/r/[slug]?deal=1` | Booking entry for a specific creator |
| `/book` | Sales call booking |
| `/free-tools/*` | 4 calculators (creator worth, engagement rate, delivery odds, budget planner) |

**In-app, from the UI screenshots:** an icon sidebar with dashboard, marketplace, deals,
campaigns, messages and billing; a creator-side sidebar reading Overview / Deals /
Earnings / Payments / Profile.

## 5. Important user journeys

The company-side journey is stated verbatim on the homepage as five numbered steps, and
the same five appear on the marketplace page. This *is* the product:

| # | Step | What it does |
|---|---|---|
| 01 | **Match** | Define vertical and ICP; surface vetted creators whose audience contains your buyers. Cards show `Fit 92%`. |
| 02 | **Brief** | Build a campaign brief — objectives, key messages, creator guidelines, tracking links ready. Labelled `AI`. |
| 03 | **Manage** | Every collaboration by status: `Draft ready`, `Scheduled`, `Live`. |
| 04 | **Track** | Attributed pipeline €48.2K +24%, 124K views, 418 leads. |
| 05 | **Pay** | Payment scheduled, handled by Naano. Contract → Invoice → Payout. Creator payout €1,240. |

Creator-side journey: apply → profile/media kit → receive collaboration request
(`Attio sent a collaboration request · Sponsored post €1,000 · Deliver by Aug 12 ·
1 post + 1 repost` with **Accept / Decline**) → publish → paid within 24h.

## 6. UI components discovered

From `02-app-marketplace-ui.png`, the **creator card** anatomy, in order:

- Sky/cloud gradient header band
- Large ghosted **rank numeral** (1, 2, 3…) — the grid is explicitly ranked
- Multi-select **checkbox** + LinkedIn badge (top-left)
- **Book** button + **favourite star** (top-right; filled blue when active)
- Circular avatar overlapping the band
- Name (bold) → niche line (`AI · SaaS`, `Growth / GTM · Software`)
- Country pill with flag
- Two-line truncated bio
- `MATCHING · 97/100` with a blue progress bar
- Three-column stat strip: **FOLLOWERS / MEDIAN VIEWS / POST COST**

From `03-app-creator-dashboard.webp`: labelled sidebar with active-item pill; greeting
header (`Welcome back, Thomas 👋`) plus a status badge; three stat cards, each with an
uppercase letterspaced label, a large bold number, a one-line caption and a soft-blue
rounded icon tile; a table with status pills (Active green, In review amber) and money
in green.

Other components: sticky nav with role switcher and language selector, logo marquee,
accordion FAQ, pricing comparison table, testimonial cards, metric counters, cookie
consent bar.

## 7. Important interactions

- **Ranked + scored marketplace grid** — sorting is a first-class concept, not a dropdown
  afterthought.
- **Multi-select via checkboxes** — implies bulk shortlist/bulk-book into a campaign.
- **Favourite/star toggle** persisted per creator.
- **Book** as the single primary CTA on every card.
- **Accept / Decline** on inbound collaboration requests (creator side).
- **Approve content → payment releases.** Approval is the state transition that triggers
  payout. This is the most important interaction in the product.
- Truncated bios, `Stats updated 7 d ago` freshness stamps, empty-state copy
  (*"Not enough engagement data yet to break down the audience."*).

## 8. Data / entities discovered

Observed on real profiles and cards:

- **Creator** — name, slug, headline, category (`AI · SaaS`), country, bio, avatar,
  followers, median/est. reach, avg reactions, avg comments, engagement %, match score
  /100, fixed price per post, verified, recent posts (text, image, reaction count,
  LinkedIn permalink), audience breakdown, "why work with me", stats freshness.
- **Campaign** — name, brand, objective, budget, status (`Draft`/`Scheduled`/`Live`),
  creators, brief, dates, metrics.
- **Brief** — objectives, key messages, creator guidelines, CTA, tracking links.
- **Offer / Deal** — creator, brand, fee, deliverables (`1 post + 1 repost`), deliver-by
  date, state (requested/accepted/in review/active).
- **Metrics** — impressions/views, clicks, leads, CTR, attributed pipeline, spend, payout.
  Real observed rows: `42.8K impressions / 312 clicks / 18 leads`;
  `100K / 1,600 / 320`. Case study: 9 creators, 2,940 qualified clicks, 512 trials.
- **Payout** — contract → invoice → payout, status, amount, Stripe Connect.

Price anchors (their published index of 239 real bookings): median €84 under 5K
followers, €180 at 5–10K, €312 at 10–25K. Used to make seed data realistic.

## 9. What should be replicated

1. Role-split signup, then role-appropriate onboarding.
2. The marketplace: ranked cards, match score, search, category/platform/price/audience
   filters, sorting, favourites, multi-select — with the exact card anatomy above.
3. Creator profile: stats, engagement, recent posts, audience, why-work-with-me, price,
   Book CTA.
4. The five-step company journey end to end, especially brief → campaign → status.
5. Campaign statuses `Draft / Scheduled / Live` and their effect on dashboard counts.
6. Attribution: impressions → clicks → leads → attributed pipeline, per campaign and
   per creator.
7. Payout ledger with contract/invoice/payout stages and approval-gated release.
8. Visual language: cloud-blue headers, white cards, uppercase letterspaced micro-labels,
   large bold numerals, status pills, soft-blue icon tiles.

## 10. What can reasonably be mocked

- Creator data — generated locally, weighted to their published price/engagement bands.
- LinkedIn stats, post content and engagement.
- Auth (localStorage session, no external provider).
- AI brief generation — deterministic local template assembly from form inputs.
- Payments — a ledger with realistic states; no processor.
- Time-series metrics — seeded deterministically so charts are stable across reloads.

## 11. What I will NOT reproduce, and why

Cut for scope, not difficulty:

| Cut | Reason |
|---|---|
| Real LinkedIn OAuth/API | No external APIs by constraint; adds keys and a failure mode. |
| Real payment processing (Stripe Connect) | Regulatory/integration weight, zero demo value over a ledger. |
| Agency side | Third role, largely the brand app with a client switcher. Lowest value per hour. |
| Blog / SEO / vertical landing pages (~70 routes) | Content marketing, not product. |
| Free-tool calculators | Peripheral lead magnets. |
| Managed-campaigns sales funnel, `/book` | Sales motion, not product surface. |
| Multi-language (EN/FR) | Real for their EU market; pure cost here. |
| Messaging/chat | Visible in the sidebar but never shown; I would be inventing it. |
| Email/notification delivery | No external services. |

I am also **not copying their brand** — no Naano logo, wordmark, colour palette or
verbatim copy. This is a re-engineering of the product, under its own identity.

---

## Design notes for the rebuild

Observed, to be matched in spirit rather than pixel-copied:

- **Palette:** near-white page ground, white cards, soft sky-blue accents and
  cloud imagery, a single confident blue primary. Green for money and active states,
  amber for in-review. No purple gradients.
- **Type:** geometric humanist sans. Large bold headings and numerals; uppercase,
  letterspaced, small grey micro-labels above every metric.
- **Shape:** generous radii (~14–16px cards, ~8px controls), hairline borders, very
  low-spread shadows. Restrained.
- **Rhythm:** stat cards in threes, dense but airy tables, heavy use of pills and chips
  for status and category.
