# Demo script — Vouch

Talking points for a camera-on walkthrough, under 5 minutes. Not a word-for-word
script; the timings are the budget, not a target.

---

## (a) What Naano is, and the one insight — ~20s

- Naano is a **B2B LinkedIn creator marketplace**: companies book vetted creators
  for sponsored posts at a fixed price, and trace clicks and pipeline back to each post.
- The insight the whole rebuild is organised around, in their words: **audience
  fit comes before follower count.**
- That means the match score is not a decoration on the card — it *is* the
  product. So I made it relational: a creator has no intrinsic score, only a
  score against *your* buyer profile.

## (b) What I built first, and what I cut — ~30s

- **First: the brand loop, end to end.** Marketplace → brief → campaign →
  attribution → payout. It is the richest surface and the one that shows product
  judgement.
- **Creator side is three screens**, not a mirror of the brand app. The one
  interaction that genuinely belongs to a creator — accept or decline an inbound
  offer — is built properly. The rest is deliberately narrow.
- **Cut, for scope not difficulty:** LinkedIn integration, real payments, the
  agency side, messaging, ~70 blog and SEO routes, the free-tool calculators,
  multi-language.
- **Cut on purpose, as a reliability decision: every external API.** No auth
  provider, no database, no payment processor, no model API. A demo that cannot
  break because a key expired is worth more than one with a real integration that
  dies mid-review. Say this out loud — it is a decision, not a shortcut.

## (c) Live click-through — ~2.5 min

Open the deployed link **signed out**.

**Landing (~15s)** — the three featured creators are ranked by the real match
function against a sample buyer profile, not hand-picked. Scroll once to show the
reveals; note they are 260ms and respect `prefers-reduced-motion`.

**Marketplace (~50s)** — the most important screen.
- It is **public**, like the original's creator directory, and server-rendered —
  all 24 creators are in the HTML.
- Filter to **Under €150**; counts next to every filter are live.
- Sort by **Best match** → the rank numerals change.
- Hover a card → availability and engagement surface **without navigating**.
  Scanning 24 creators is the actual job here.
- Star two or three. Tick their checkboxes → the selection bar shows the running
  total → **Create campaign**.

**Creator profile (~25s)** — open one first.
- Point at the **Audience match** panel. This is where I went past the original:
  Naano shows `97/100` and nothing else. This shows the four factors, the points,
  and the reasoning — *"44% of this audience is Engineering leaders"*.
- Note that engagement quality is normalised for audience size, so nano-creators
  do not automatically win.

**Campaign creation (~40s)**
- Four steps. Try to advance with an empty name → real validation, not a red border.
- Step 3: budget tracks live against the selection and warns without blocking.
- Step 4: the brief is generated from the objective, the audience, the key
  message and **the topics your chosen creators actually cover**. Change the
  shortlist and it changes.
- Call it **"Assisted"**, and say why: it is deterministic local generation, not a
  model call. Reproducible, no key, cannot fail.

**Launch and attribution (~20s)** — the money shot.
- Hit **Launch** → confirm.
- Creators publish, per-creator metrics appear, the chart fills — each post spikes
  on its publish day then decays, so staggered publishing shows as separate bumps.
- Go to the **dashboard**: the totals moved. Nothing here is hardcoded; campaign
  totals are always summed from per-creator collaborations, so the three screens
  cannot disagree.

## (d) One UI/UX decision I'm proud of — ~30s

Pick one and commit to it. Strongest option:

**The match breakdown.** Showing a bare score asks the buyer to trust a number
they cannot interrogate — which is exactly the objection a B2B buyer has about
influencer marketing in the first place. Breaking it into audience overlap, topic
relevance, market and size-adjusted engagement quality turns the score from a
claim into an argument. It also made the product honest with itself: once the
factors are visible, the weighting has to be defensible.

Runner-up if you prefer something smaller: **the marketplace loading state.** The
first version gated the grid behind a 220ms timer, which meant the server-rendered
HTML contained only skeletons — invisible to crawlers, on the page that is the
product's best advert. I caught it in QA, removed the fake delay and moved the
skeleton to Next's route-level `loading.tsx`, where it is a real navigation state.
Good honesty note: it shows the QA pass caught something real.

## (e) With another day — ~20s

- **Real click attribution.** A `/l/[code]` route that redirects and logs an actual
  click event, so the dashboard reads rows a visitor generated rather than a
  simulation. Highest-value next thing by a distance, and about an afternoon.
- Per-creator brief variants and post-generation editing.
- A "which creator returned the most pipeline per euro" comparison — the question
  every buyer actually asks at renewal.
- Server persistence behind the existing store interface, so a workspace is
  shared across browsers rather than per-device.

---

### Notes to self

- Say **"re-engineering", not "clone"** — different name, palette, illustration
  style and copy throughout. That was a constraint, and it is worth naming.
- If asked what is fake: be direct. Auth is `localStorage`, creators are
  fictional, metrics are simulated, payments are represented. All of it is in the
  README's Limitations section, which is there so nobody has to ask.
- If the numbers look suspiciously clean: they are derived deterministically from
  each creator's reach and engagement, anchored to Naano's own published price
  index (median €84 under 5K followers, €180 at 5–10K, €312 at 10–25K).
