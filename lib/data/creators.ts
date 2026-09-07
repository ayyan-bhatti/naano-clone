import type { AudienceSegment, Creator, Platform, RecentPost } from '@/lib/types';

/**
 * Marketplace seed data.
 *
 * Identity fields (name, headline, bio, topics, country) are hand-authored so the
 * grid reads as 24 distinct people rather than one template with the numbers
 * changed. Derived stats (reach, reactions, audience mix, recent posts) are
 * computed deterministically from the slug, so they are varied, internally
 * consistent, and identical on server and client - which matters because a
 * mismatch would cause hydration errors.
 *
 * Pricing is anchored to Naano's own published index of 239 real bookings:
 * median EUR 84 under 5K followers, EUR 180 at 5-10K, EUR 312 at 10-25K.
 */

interface CreatorSeed {
  name: string;
  username: string;
  country: string;
  flag: string;
  category: string;
  headline: string;
  topics: string[];
  bio: string;
  why: string;
  followers: number;
  /** Engagement rate as a percentage. */
  engagement: number;
  price: number;
  platforms?: Platform[];
  verified?: boolean;
  availability?: Creator['availability'];
}

const SEEDS: CreatorSeed[] = [
  {
    name: 'Aymane Belkacem',
    username: 'aymanebk',
    country: 'Germany',
    flag: '🇩🇪',
    category: 'AI · SaaS',
    headline: 'Staff engineer writing about applied AI in production',
    topics: ['AI', 'Engineering', 'SaaS', 'LLMs'],
    bio: 'Building intelligent systems that turn messy data into decisions. I write about what actually ships, not what demos well.',
    why: 'My audience is engineering leaders who evaluate tooling for real teams. I only take briefs where I can be specific about the technical trade-offs, which is why the click-through tends to be high.',
    followers: 14100,
    engagement: 4.1,
    price: 360,
    verified: true,
  },
  {
    name: 'Emma Guetta',
    username: 'emmaguetta',
    country: 'France',
    flag: '🇫🇷',
    category: 'Media · Content',
    headline: 'Content strategist for B2B SaaS · ex-Head of Content at two Series B startups',
    topics: ['Content', 'Brand', 'SaaS', 'Storytelling'],
    bio: 'I help SaaS teams stop publishing into the void. Weekly notes on positioning, narrative and the content nobody wants to write but everybody reads.',
    why: 'People come to me for opinionated takes on positioning. Sponsored posts land best when the product genuinely changes how a team works — I will tell you if I do not think it does.',
    followers: 7800,
    engagement: 5.4,
    price: 480,
    verified: true,
  },
  {
    name: 'Augustin Rudigoz',
    username: 'arudigoz',
    country: 'France',
    flag: '🇫🇷',
    category: 'Productivity · Fintech',
    headline: 'Operator investor · writing on SMB buyouts and finance ops',
    topics: ['Fintech', 'Finance', 'Operations', 'M&A'],
    bio: 'Entrepreneurs, operators, investors. I write about acquiring and running French SMBs, and the unglamorous finance stack underneath.',
    why: 'A narrow but senior audience: CFOs, finance leads and founders who actually hold the budget. Small reach, unusually high intent.',
    followers: 14000,
    engagement: 3.2,
    price: 960,
    verified: true,
  },
  {
    name: 'Raghav Jerath',
    username: 'raghavjerath',
    country: 'France',
    flag: '🇫🇷',
    category: 'Growth · GTM',
    headline: 'Growth at a YC-backed dev tool · writing the playbooks as I run them',
    topics: ['Growth', 'GTM', 'DevTools', 'Experiments'],
    bio: 'International Business School grad now doing growth at a YC company. I publish the experiment, the numbers, and the ones that failed.',
    why: 'I show real dashboards and real numbers. That transparency is why founders trust the recommendations — but it means I need access to genuine data from the product.',
    followers: 2400,
    engagement: 7.8,
    price: 84,
  },
  {
    name: 'Daniel Meisen',
    username: 'dmeisen',
    country: 'Germany',
    flag: '🇩🇪',
    category: 'Agencies · Consulting',
    headline: 'Runs a 12-person B2B growth agency · shares the operating manual',
    topics: ['Agency', 'Consulting', 'GTM', 'Ops'],
    bio: 'Twelve people, no outside money, six years. I write about running a services business without pretending it is a startup.',
    why: 'Agency owners and consultants who buy tools for their whole team. One post often reaches thirty buying decisions rather than one.',
    followers: 5900,
    engagement: 4.6,
    price: 120,
  },
  {
    name: 'Pia Davadan',
    username: 'piadavadan',
    country: 'France',
    flag: '🇫🇷',
    category: 'SaaS · AI',
    headline: 'VC analyst · mapping the European AI application layer',
    topics: ['AI', 'Venture', 'SaaS', 'Market maps'],
    bio: 'Analyst covering early-stage European AI. Market maps, funding breakdowns, and the occasional argument with a thesis.',
    why: 'Founders and investors read me for the map, not the hype. Works well for infrastructure and developer products with a real technical story.',
    followers: 4200,
    engagement: 6.1,
    price: 84,
  },
  {
    name: 'Marta Ferreira',
    username: 'martaferreira',
    country: 'Portugal',
    flag: '🇵🇹',
    category: 'RevOps · Sales',
    headline: 'RevOps lead · fixing the CRM nobody wants to own',
    topics: ['RevOps', 'CRM', 'Sales', 'Data'],
    bio: 'Ten years untangling pipelines, forecasts and the seventeen fields somebody added in 2019. Practical RevOps, weekly.',
    why: 'RevOps is a small, tight community that shares tooling recommendations constantly. My audience buys and then tells their peers.',
    followers: 9300,
    engagement: 4.9,
    price: 180,
    verified: true,
  },
  {
    name: 'Tomas Loucky',
    username: 'tomasloucky',
    country: 'Czechia',
    flag: '🇨🇿',
    category: 'DevTools · Engineering',
    headline: 'Backend engineer · distributed systems, observability, and the cost of both',
    topics: ['DevTools', 'Infrastructure', 'Observability', 'Engineering'],
    bio: 'I write about the parts of infrastructure that only hurt at 3am. Postgres, queues, tracing, and bills that surprise you.',
    why: 'Engineers are allergic to marketing. I rewrite every brief in my own words and test the product first — that is non-negotiable, and it is why it converts.',
    followers: 21400,
    engagement: 3.4,
    price: 540,
    verified: true,
    platforms: ['linkedin', 'x'],
  },
  {
    name: 'Anna Kulik',
    username: 'annakulik',
    country: 'Poland',
    flag: '🇵🇱',
    category: 'HR Tech · People',
    headline: 'Head of People at a 300-person scale-up',
    topics: ['HR Tech', 'People ops', 'Hiring', 'Culture'],
    bio: 'Hiring, performance and the awkward conversations in between. Notes from actually running the function, not consulting on it.',
    why: 'People leaders buy HR software on peer recommendation more than any category I know. My comments section is where the real evaluation happens.',
    followers: 12600,
    engagement: 5.2,
    price: 340,
    verified: true,
  },
  {
    name: 'Joseph Rudd',
    username: 'josephrudd',
    country: 'United Kingdom',
    flag: '🇬🇧',
    category: 'Sales · GTM',
    headline: 'Enterprise AE turned sales coach · 300+ reps trained',
    topics: ['Sales', 'Outbound', 'Enablement', 'GTM'],
    bio: 'I sold enterprise software for eleven years and now teach people to do it without sounding like a robot. Scripts, calls, teardowns.',
    why: 'Sales leaders buy for whole teams. When a tool genuinely saves reps time I can demonstrate it on a live call teardown, which beats any ad.',
    followers: 38900,
    engagement: 2.8,
    price: 820,
    verified: true,
  },
  {
    name: 'Evelyn Qiao',
    username: 'evelynqiao',
    country: 'Netherlands',
    flag: '🇳🇱',
    category: 'Product · Design',
    headline: 'Principal PM · writing about product decisions with real trade-offs',
    topics: ['Product', 'Design', 'Strategy', 'SaaS'],
    bio: 'Product management without the frameworks industrial complex. What we shipped, what we killed, and what it cost.',
    why: 'PMs and designers who evaluate tools hands-on. I insist on using a product for two weeks before writing, which is slower but the posts hold up.',
    followers: 17200,
    engagement: 4.4,
    price: 460,
    verified: true,
  },
  {
    name: 'Lukas Brenner',
    username: 'lukasbrenner',
    country: 'Austria',
    flag: '🇦🇹',
    category: 'Marketing Ops',
    headline: 'Marketing ops · attribution, routing, and the truth about your funnel',
    topics: ['Marketing ops', 'Attribution', 'Data', 'Automation'],
    bio: 'Somebody has to own the lead routing. Weekly on attribution models, martech consolidation, and dashboards that lie.',
    why: 'Attribution is my whole beat, so tracking and measurement products land naturally rather than feeling bolted on.',
    followers: 6700,
    engagement: 5.0,
    price: 165,
  },
  {
    name: 'Sofia Marchetti',
    username: 'sofiamarchetti',
    country: 'Italy',
    flag: '🇮🇹',
    category: 'Fintech · Finance',
    headline: 'Fractional CFO for European SaaS · numbers, plainly',
    topics: ['Fintech', 'Finance', 'SaaS metrics', 'Fundraising'],
    bio: 'I close the books for six SaaS companies. Runway, burn multiple, and why your net revenue retention is not what you think.',
    why: 'Founders and finance leads at the exact moment they are choosing a finance stack. Small audience, very high purchase intent.',
    followers: 8100,
    engagement: 5.6,
    price: 290,
    verified: true,
  },
  {
    name: 'Rohit Ranjan',
    username: 'rohitranjan',
    country: 'Ireland',
    flag: '🇮🇪',
    category: 'AI · Engineering',
    headline: 'ML engineer · shipping models that survive contact with users',
    topics: ['AI', 'ML', 'Engineering', 'Evals'],
    bio: 'Evals, retrieval, and the gap between a demo and a product. I write for people who have to keep this running on Monday.',
    why: 'Deeply technical audience that will spot a hollow claim instantly. Briefs work when I can show the thing working on a real dataset.',
    followers: 26800,
    engagement: 3.1,
    price: 620,
    verified: true,
    platforms: ['linkedin', 'x', 'newsletter'],
  },
  {
    name: 'Hannah Alley',
    username: 'hannahalley',
    country: 'United Kingdom',
    flag: '🇬🇧',
    category: 'Content · SEO',
    headline: 'SEO lead · organic growth for B2B software',
    topics: ['SEO', 'Content', 'Growth', 'AI search'],
    bio: 'Fifteen years of organic. Now mostly writing about what AI search does to a content strategy built for ten blue links.',
    why: 'Marketing leaders rebuilding their organic strategy right now. Timely, and they are actively re-evaluating tooling.',
    followers: 19500,
    engagement: 3.9,
    price: 430,
    verified: true,
  },
  {
    name: 'Kevin Meyer',
    username: 'kevinmeyer',
    country: 'Switzerland',
    flag: '🇨🇭',
    category: 'Security · Compliance',
    headline: 'CISO · security for companies that are not banks',
    topics: ['Security', 'Compliance', 'SOC 2', 'Risk'],
    bio: 'Practical security for mid-market software. SOC 2 without the theatre, vendor reviews, and incident write-ups.',
    why: 'Security buyers are sceptical by profession. I disclose every commercial relationship explicitly, which is exactly why they believe the recommendation.',
    followers: 11200,
    engagement: 3.6,
    price: 510,
    verified: true,
  },
  {
    name: 'Nadia Ait Ouchene',
    username: 'nadiaao',
    country: 'Belgium',
    flag: '🇧🇪',
    category: 'Marketing · Brand',
    headline: 'Brand marketer · the case for B2B that is not beige',
    topics: ['Brand', 'Marketing', 'Creative', 'Positioning'],
    bio: 'B2B does not have to be boring, and I have the campaign results to argue about it. Brand, creative, and the fight for budget.',
    why: 'Marketing leaders who care about craft. They notice when a sponsored post is lazy, so I only take work I would write anyway.',
    followers: 10900,
    engagement: 5.9,
    price: 300,
  },
  {
    name: 'Mikkel Sørensen',
    username: 'mikkelsorensen',
    country: 'Denmark',
    flag: '🇩🇰',
    category: 'Vertical SaaS',
    headline: 'Founder · vertical SaaS for logistics',
    topics: ['Vertical SaaS', 'Logistics', 'Founder', 'Bootstrapping'],
    bio: 'Bootstrapped to 4M ARR selling software to freight forwarders. Writing the unsexy path in public.',
    why: 'Founders of niche software businesses. They buy tools carefully and keep them for years, so the LTV of a good recommendation is unusual.',
    followers: 15800,
    engagement: 4.7,
    price: 400,
    verified: true,
  },
  {
    name: 'Elitsa Raynova',
    username: 'elitsaraynova',
    country: 'Bulgaria',
    flag: '🇧🇬',
    category: 'Customer Success',
    headline: 'VP Customer Success · retention is a product problem',
    topics: ['Customer success', 'Retention', 'SaaS', 'Onboarding'],
    bio: 'Churn post-mortems, onboarding teardowns, and why your QBR is not working. Written from inside the function.',
    why: 'CS leaders own real budget for tooling and are chronically underserved by content. Engagement here is unusually high for the audience size.',
    followers: 7400,
    engagement: 6.3,
    price: 200,
  },
  {
    name: 'Guillaume Deramchi',
    username: 'gderamchi',
    country: 'France',
    flag: '🇫🇷',
    category: 'DevTools · Open source',
    headline: 'Open source maintainer · developer experience, loudly',
    topics: ['Open source', 'DevTools', 'DX', 'Community'],
    bio: 'Maintaining a library you have probably installed. I write about DX, community, and the economics of giving software away.',
    why: 'Developers who install first and ask later. My audience will actually try the product the same day, so click-through skews high.',
    followers: 3100,
    engagement: 8.4,
    price: 95,
  },
  {
    name: 'Ingrid Halvorsen',
    username: 'ingridhalvorsen',
    country: 'Norway',
    flag: '🇳🇴',
    category: 'Data · Analytics',
    headline: 'Analytics engineer · the modern data stack, minus the hype',
    topics: ['Data', 'Analytics', 'dbt', 'Warehousing'],
    bio: 'dbt, warehouses, and the eternal question of who owns the metric. Notes from a team of three doing the work of ten.',
    why: 'Data teams evaluating their stack. Technical enough to be sceptical, small enough that one recommendation moves the whole team.',
    followers: 5300,
    engagement: 6.0,
    price: 145,
  },
  {
    name: 'Diego Salvatierra',
    username: 'diegosalvatierra',
    country: 'Spain',
    flag: '🇪🇸',
    category: 'Growth · PLG',
    headline: 'Product-led growth · onboarding teardowns every Tuesday',
    topics: ['PLG', 'Growth', 'Onboarding', 'Activation'],
    bio: 'I tear down a SaaS onboarding flow every week and score it. Sometimes the founders even thank me for it.',
    why: 'The teardown format means a sponsored post is genuinely useful rather than an interruption — I review the product publicly, flaws included.',
    followers: 22600,
    engagement: 4.2,
    price: 490,
    verified: true,
  },
  {
    name: 'Yonathan Levy',
    username: 'yonathanlevy',
    country: 'Israel',
    flag: '🇮🇱',
    category: 'Sales Tech',
    headline: 'Sales engineer · demos, POCs and technical wins',
    topics: ['Sales tech', 'Pre-sales', 'Demos', 'Enablement'],
    bio: 'The person on the call who answers the hard question. Writing about pre-sales, POCs, and losing deals for the right reasons.',
    why: 'Sales engineers and technical founders. Narrow, but they influence every enterprise purchase their company makes.',
    followers: 6100,
    engagement: 5.1,
    price: 175,
  },
  {
    name: 'Clara Nowak',
    username: 'claranowak',
    country: 'Germany',
    flag: '🇩🇪',
    category: 'Ops · Automation',
    headline: 'Business ops · automating the work nobody wants to do',
    topics: ['Operations', 'Automation', 'No-code', 'Process'],
    bio: 'I automate the spreadsheet before it becomes a department. Practical ops for companies between 20 and 200 people.',
    why: 'Ops people are the ones who actually implement tools. If I recommend something, my audience has it running by Friday.',
    followers: 4600,
    engagement: 6.7,
    price: 110,
  },
];

/* ------------------------------------------------------------------ *
 * Deterministic derivation
 * ------------------------------------------------------------------ */

/** FNV-1a. Stable across server and client, unlike Math.random. */
function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic float in [0,1) from a seed string plus a salt. */
function rand(seed: string, salt: string): number {
  return hash(`${seed}:${salt}`) / 0xffffffff;
}

function pick<T>(seed: string, salt: string, items: readonly T[]): T {
  return items[Math.floor(rand(seed, salt) * items.length) % items.length];
}

function between(seed: string, salt: string, min: number, max: number): number {
  return Math.round(min + rand(seed, salt) * (max - min));
}

const PERSONA_POOLS: Record<string, string[]> = {
  engineering: ['Engineers', 'Engineering leaders', 'CTOs', 'Platform teams'],
  gtm: ['Sales leaders', 'AEs & SDRs', 'RevOps', 'Founders'],
  marketing: ['Marketing leaders', 'Content teams', 'Growth', 'Demand gen'],
  finance: ['CFOs & finance', 'Founders', 'Investors', 'Operators'],
  people: ['People & HR', 'Founders', 'Managers', 'Talent'],
  product: ['Product managers', 'Designers', 'Founders', 'Engineering leaders'],
};

function poolFor(category: string): string[] {
  const c = category.toLowerCase();
  if (/engineer|devtool|ai|security|data|open source/.test(c)) return PERSONA_POOLS.engineering;
  if (/sales|growth|revops|gtm|plg/.test(c)) return PERSONA_POOLS.gtm;
  if (/market|content|brand|seo/.test(c)) return PERSONA_POOLS.marketing;
  if (/fintech|finance/.test(c)) return PERSONA_POOLS.finance;
  if (/hr|people|customer/.test(c)) return PERSONA_POOLS.people;
  return PERSONA_POOLS.product;
}

/** Four segments that sum to exactly 100, weighted toward the primary persona. */
function buildAudience(slug: string, category: string): AudienceSegment[] {
  const pool = poolFor(category);
  const primary = 34 + Math.floor(rand(slug, 'aud0') * 16); // 34-49
  const second = 22 + Math.floor(rand(slug, 'aud1') * 10); // 22-31
  const third = 12 + Math.floor(rand(slug, 'aud2') * 8); // 12-19
  const fourth = 100 - primary - second - third;
  return [
    { label: pool[0], share: primary },
    { label: pool[1], share: second },
    { label: pool[2], share: third },
    { label: pool[3], share: fourth },
  ];
}

const POST_TEMPLATES: Record<string, string[]> = {
  engineering: [
    'We cut our p99 from 1.8s to 340ms and it had nothing to do with the database. Here is what it actually was.',
    'Everyone benchmarks the happy path. Here is what happened when we ran the same setup with 40% packet loss.',
    'The observability bill doubled and nobody noticed for two months. A short post-mortem on cardinality.',
    'I rewrote it in Rust and it was 6x faster. I also lost three weeks. Both things are true.',
  ],
  gtm: [
    'Most sales teams spend 80% of their time on the wrong accounts. Here is the qualification change that fixed it for us.',
    'I reviewed 40 outbound sequences this month. 34 of them opened with the same sentence.',
    'We killed the SDR-to-AE handoff meeting and pipeline went up. Not what I expected either.',
    'The deal did not die on price. It died in week two when we could not answer one technical question.',
  ],
  marketing: [
    'We stopped publishing three posts a week and started publishing one. Traffic went up 40%.',
    'Your competitor is not outranking you. An AI summary is answering the question before anyone clicks.',
    'The brand campaign everyone loved generated zero pipeline. Here is what I would do differently.',
    'I audited 30 B2B homepages. 26 of them do not say what the product does.',
  ],
  finance: [
    'Your burn multiple is fine. Your net revenue retention is the thing that will hurt you in the next round.',
    'We closed the books in four days instead of three weeks. Here is the actual stack.',
    'A short thread on why your ARR number and your cash number disagree, and which one the board cares about.',
    'Runway is not a number, it is a set of assumptions. Here are the three that break first.',
  ],
  people: [
    'We replaced annual reviews with something lighter and retention improved. Here is the honest version.',
    'The hiring process took 41 days. Candidates were dropping at stage three. We found out why.',
    'Onboarding is the cheapest retention lever you have and almost nobody measures it.',
    'I asked 200 people what made them stay. Compensation was fourth.',
  ],
  product: [
    'We shipped the feature everyone asked for and usage was 2%. A short post-mortem.',
    'The roadmap is not the problem. The thing underneath it — how you decide — is the problem.',
    'I tore down five onboarding flows this week. The best one had fewer steps, not more polish.',
    'We killed our most-requested feature after eight weeks. Here is the data that made the call.',
  ],
};

function postPoolFor(category: string): string[] {
  const c = category.toLowerCase();
  if (/engineer|devtool|ai|security|data|open source/.test(c)) return POST_TEMPLATES.engineering;
  if (/sales|growth|revops|gtm|plg/.test(c)) return POST_TEMPLATES.gtm;
  if (/market|content|brand|seo/.test(c)) return POST_TEMPLATES.marketing;
  if (/fintech|finance/.test(c)) return POST_TEMPLATES.finance;
  if (/hr|people|customer/.test(c)) return POST_TEMPLATES.people;
  return POST_TEMPLATES.product;
}

/** Fixed reference date keeps "posted 12d ago" stable between renders. */
const REFERENCE_DATE = new Date('2026-09-01T00:00:00Z');

function daysAgoIso(days: number): string {
  return new Date(REFERENCE_DATE.getTime() - days * 86_400_000).toISOString();
}

function buildRecentPosts(slug: string, category: string, avgReactions: number): RecentPost[] {
  const pool = postPoolFor(category);
  const count = 3 + Math.floor(rand(slug, 'postcount') * 2); // 3-4
  const posts: RecentPost[] = [];
  for (let i = 0; i < count; i += 1) {
    const variance = 0.55 + rand(slug, `pv${i}`) * 1.3;
    const reactions = Math.max(3, Math.round(avgReactions * variance));
    posts.push({
      id: `${slug}-post-${i + 1}`,
      excerpt: pool[(hash(`${slug}${i}`) + i) % pool.length],
      reactions,
      comments: Math.max(1, Math.round(reactions * (0.06 + rand(slug, `pc${i}`) * 0.1))),
      postedAt: daysAgoIso(4 + i * 7 + Math.floor(rand(slug, `pd${i}`) * 5)),
    });
  }
  return posts;
}

/** Characters that do not decompose under NFD and would otherwise be dropped. */
const TRANSLITERATE: Record<string, string> = {
  ø: 'o',
  æ: 'ae',
  å: 'a',
  ß: 'ss',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[øæåßłđðþ]/g, (ch) => TRANSLITERATE[ch] ?? ch)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function build(seed: CreatorSeed): Creator {
  const slug = slugify(seed.name);
  const avgReactions = Math.round((seed.followers * seed.engagement) / 100 / 1.35);
  const medianViews = Math.round(seed.followers * (1.1 + rand(slug, 'views') * 1.4));

  return {
    id: slug,
    slug,
    name: seed.name,
    username: seed.username,
    avatarSeed: slug,
    headline: seed.headline,
    bio: seed.bio,
    whyWorkWithMe: seed.why,
    category: seed.category,
    topics: seed.topics,
    country: seed.country,
    countryFlag: seed.flag,
    followers: seed.followers,
    medianViews,
    avgReactions,
    avgComments: Math.max(1, Math.round(avgReactions * (0.08 + rand(slug, 'comm') * 0.09))),
    engagement: seed.engagement,
    audience: buildAudience(slug, seed.category),
    pricePerPost: seed.price,
    platforms: seed.platforms ?? ['linkedin'],
    availability:
      seed.availability ?? pick(slug, 'avail', ['open', 'open', 'open', 'limited', 'booked'] as const),
    verified: seed.verified ?? false,
    statsAgeDays: between(slug, 'stats', 1, 12),
    recentPosts: buildRecentPosts(slug, seed.category, avgReactions),
  };
}

export const CREATORS: Creator[] = SEEDS.map(build);

export const CREATORS_BY_ID: Record<string, Creator> = Object.fromEntries(
  CREATORS.map((c) => [c.id, c]),
);

export function getCreator(id: string): Creator | undefined {
  return CREATORS_BY_ID[id];
}

/** Every distinct category, for the marketplace filter rail. */
export const CATEGORIES: string[] = Array.from(
  new Set(CREATORS.flatMap((c) => c.category.split(' · '))),
).sort();

export const COUNTRIES: string[] = Array.from(new Set(CREATORS.map((c) => c.country))).sort();

export const ALL_TOPICS: string[] = Array.from(new Set(CREATORS.flatMap((c) => c.topics))).sort();
