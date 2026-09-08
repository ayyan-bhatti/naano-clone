import type { Role } from '@/lib/types';

/**
 * What the assistant knows.
 *
 * Hand-authored, because the constraint on this build is no external APIs and
 * no keys - so there is no model behind this. What there is instead is a
 * retrieval engine over these entries (lib/assistant/engine.ts), which is a
 * real technique rather than a fig leaf: it tokenises the question, expands
 * synonyms, scores every entry and returns the best match with a confidence.
 * When nothing clears the threshold it says so rather than inventing an
 * answer, which is the failure mode that matters.
 *
 * Answers may be a function of live workspace state, so "how many drafts are
 * waiting on me" is read out of the store rather than described in the
 * abstract.
 */

export interface AssistantContext {
  route: string;
  signedIn: boolean;
  role?: Role;
  company?: string;
  firstName?: string;
  campaigns: number;
  liveCampaigns: number;
  pipeline: number;
  clicks: number;
  draftsWaiting: number;
  unreadMessages: number;
  shortlisted: number;
  creatorEarnings: number;
  openDeals: number;
}

export interface KnowledgeLink {
  label: string;
  href: string;
}

export interface Entry {
  id: string;
  /** Ways a person might phrase this. Matched loosely, never exactly. */
  patterns: string[];
  /** Terms that should pull hard toward this entry. */
  keywords: string[];
  answer: string | ((ctx: AssistantContext) => string);
  links?: KnowledgeLink[];
  /** Only offered to one side of the marketplace when set. */
  role?: Role;
}

/* ------------------------------------------------------------------ *
 * Routes the assistant can take you to
 * ------------------------------------------------------------------ */

export interface Destination {
  href: string;
  label: string;
  /** Words that should resolve to this page. */
  terms: string[];
  role?: Role;
  requiresAuth?: boolean;
}

export const DESTINATIONS: Destination[] = [
  { href: '/', label: 'Home', terms: ['home', 'landing', 'front page', 'start'] },
  { href: '/marketplace', label: 'the marketplace', terms: ['marketplace', 'creators', 'browse', 'directory', 'search creators', 'find creators'] },
  { href: '/pricing', label: 'pricing', terms: ['pricing', 'price', 'cost', 'plans', 'how much', 'fees'] },
  { href: '/free-tools', label: 'the free tools', terms: ['tools', 'free tools', 'calculators', 'calculator'] },
  { href: '/free-tools/creator-worth', label: 'the creator worth calculator', terms: ['worth', 'what am i worth', 'rate calculator', 'my rate'] },
  { href: '/free-tools/engagement-rate', label: 'the engagement rate calculator', terms: ['engagement', 'engagement rate'] },
  { href: '/free-tools/delivery-odds', label: 'the delivery odds tool', terms: ['delivery', 'odds', 'will they post', 'publication rate'] },
  { href: '/free-tools/campaign-budget', label: 'the budget planner', terms: ['budget', 'planner', 'plan a budget', 'allocation'] },
  { href: '/free-tools/creator-search', label: 'creator matching', terms: ['matching', 'match me', 'creator search', 'who should i work with'] },
  { href: '/dashboard', label: 'your dashboard', terms: ['dashboard', 'overview', 'home screen'], requiresAuth: true },
  { href: '/campaigns', label: 'your campaigns', terms: ['campaigns', 'my campaigns'], role: 'brand', requiresAuth: true },
  { href: '/campaigns/new', label: 'the campaign builder', terms: ['new campaign', 'create campaign', 'launch a campaign', 'start a campaign'], role: 'brand', requiresAuth: true },
  { href: '/messages', label: 'your messages', terms: ['messages', 'inbox', 'chat', 'conversations'], requiresAuth: true },
  { href: '/payouts', label: 'the payout ledger', terms: ['payouts', 'ledger', 'what i owe'], role: 'brand', requiresAuth: true },
  { href: '/settings', label: 'settings', terms: ['settings', 'preferences', 'buyer profile', 'account'], requiresAuth: true },
  { href: '/deals', label: 'your deals', terms: ['deals', 'offers', 'invitations'], role: 'creator', requiresAuth: true },
  { href: '/earnings', label: 'your earnings', terms: ['earnings', 'what i earned'], role: 'creator', requiresAuth: true },
  { href: '/payments', label: 'your payment settings', terms: ['payments', 'payout method', 'bank', 'get paid'], role: 'creator', requiresAuth: true },
  { href: '/profile', label: 'your profile editor', terms: ['my profile', 'edit profile', 'edit my profile'], role: 'creator', requiresAuth: true },
  { href: '/media-kit', label: 'your media kit', terms: ['media kit', 'press kit', 'one pager'], role: 'creator', requiresAuth: true },
  { href: '/sign-up', label: 'sign up', terms: ['sign up', 'register', 'create account', 'join'] },
  { href: '/sign-in', label: 'sign in', terms: ['sign in', 'log in', 'login'] },
];

/* ------------------------------------------------------------------ *
 * The knowledge base
 * ------------------------------------------------------------------ */

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-GB')}`;

export const ENTRIES: Entry[] = [
  /* ---- What this is ---- */
  {
    id: 'what-is-vouch',
    patterns: ['what is vouch', 'what does this do', 'what is this site', 'explain vouch', 'tell me about vouch', 'what do you do'],
    keywords: ['vouch', 'product', 'platform', 'site'],
    answer:
      'Vouch is a B2B creator marketplace. Brands find LinkedIn creators whose audience matches the people they actually sell to, brief them, and trace the clicks, leads and pipeline back to every individual post.\n\nThe part that makes it different from an influencer database is that it is transactional: you shortlist, brief, book and measure in one place, and the price is fixed and visible before you commit.',
    links: [
      { label: 'Browse the marketplace', href: '/marketplace' },
      { label: 'How pricing works', href: '/pricing' },
    ],
  },
  {
    id: 'who-is-it-for',
    patterns: ['who is this for', 'is this for me', 'who uses this', 'is this for brands or creators'],
    keywords: ['audience', 'brands', 'creators', 'suited'],
    answer:
      'Both sides of the same marketplace.\n\n**Brands** — usually B2B SaaS marketing teams — find creators, run campaigns and measure what came back.\n\n**Creators** get paid to post about products they actually use, at a fixed fee they set themselves, with no negotiating and no invoicing.',
    links: [
      { label: 'Sign up as a brand', href: '/sign-up' },
      { label: 'See what creators earn', href: '/free-tools/creator-worth' },
    ],
  },

  /* ---- Pricing ---- */
  {
    id: 'pricing',
    patterns: ['how much does it cost', 'what is the price', 'is it free', 'pricing', 'what do you charge', 'subscription cost'],
    keywords: ['price', 'cost', 'pricing', 'free', 'charge', 'expensive', 'money', 'pay', 'plan'],
    answer:
      'The platform is free. You pay creators.\n\nEvery price is a flat fee per post, set by the creator and visible before you book — never a cost per click, impression or lead. A post that goes viral costs the same as one that does not.\n\nOn the marketplace today creators run from €84 to €960 per post, and the median booking sits around €180.',
    links: [{ label: 'The full price index', href: '/pricing' }],
  },
  {
    id: 'price-by-size',
    patterns: ['what should i pay a creator', 'how much for a post', 'what is a fair rate', 'typical price for followers'],
    // 'should' and 'much' are what separate this from the payouts entry, which
    // shares its content tokens exactly.
    keywords: ['fair', 'typical', 'rate', 'median', 'benchmark', 'followers', 'band', 'pay', 'much', 'should'],
    answer:
      'It depends on audience size, and the spread inside a band is wider than the gap between bands:\n\n• **Under 5K followers** — median €84\n• **5–10K** — median €180\n• **10–25K** — median €300\n• **25–50K** — median €588\n• **50K+** — median €720\n\nThat is from 300 transacted bookings. The counterintuitive part: paying more does not reliably get the post published — the €200–399 band has the weakest delivery rate of any band.',
    links: [{ label: 'See the whole index', href: '/pricing' }],
  },

  /* ---- Matching ---- */
  {
    id: 'matching',
    patterns: ['how does matching work', 'what is the match score', 'how do you rank creators', 'audience fit'],
    keywords: ['match', 'matching', 'score', 'rank', 'fit', 'audience', 'relevance'],
    answer:
      'Every creator is scored against your buyer profile, not against some universal quality bar. The score is relational — change who you sell to and the whole ranking changes.\n\nIt weighs audience composition and topic overlap far above raw follower count, because a 3,000-follower engineer whose audience is 44% engineering leaders will out-convert a 40,000-follower generalist for a developer tool.\n\nThe breakdown is shown per factor, so you can see exactly why someone ranked where they did.',
    links: [
      { label: 'See the ranking', href: '/marketplace' },
      { label: 'Try the matcher', href: '/free-tools/creator-search' },
    ],
  },

  /* ---- Attribution ---- */
  {
    id: 'attribution',
    patterns: ['how does tracking work', 'how do you measure', 'attribution', 'how do i know it worked', 'tracked links'],
    keywords: ['track', 'tracking', 'attribution', 'measure', 'link', 'clicks', 'leads', 'pipeline', 'roi'],
    answer:
      'Every campaign gets a short tracked link, and every creator on it gets their own variant of that link.\n\nThat is what makes a click attributable to the specific post that caused it rather than to the campaign as a whole. Campaign totals are always the sum of per-creator performance — never a number typed into a dashboard.\n\nThe chain is impressions → clicks → leads → attributed pipeline, and the drop-off at each stage stays visible rather than being rounded away.',
    links: [{ label: 'See it on the landing page', href: '/#trace' }],
  },

  /* ---- The collaboration loop ---- */
  {
    id: 'campaign-flow',
    patterns: ['how do i run a campaign', 'how does it work', 'what are the steps', 'how do i get started', 'process'],
    keywords: ['campaign', 'run', 'steps', 'process', 'flow', 'started'],
    answer:
      'Five steps, one loop:\n\n1. **Match** — describe who you sell to, and creators are scored against that\n2. **Brief** — objectives, key messages and the tracked link, assembled from your inputs\n3. **Manage** — invitations, accepts, reviews and publishes on one board\n4. **Trace** — clicks, leads and pipeline, per creator and per campaign\n5. **Pay** — fixed fee agreed before booking, released on approval',
    links: [{ label: 'Start a campaign', href: '/campaigns/new' }],
  },
  {
    id: 'review',
    patterns: ['how does approval work', 'can i review the post', 'draft review', 'do i see it before it goes live', 'request changes'],
    keywords: ['draft', 'review', 'approve', 'approval', 'changes', 'revision', 'publish'],
    answer:
      'Nothing publishes until you have read it.\n\nThe creator writes the post and submits it. You either approve it — which is what publishes it and schedules the fee — or send it back with written feedback, and they submit a revision. Revisions are append-only, so the history of what was asked for survives.\n\nThe submit screen draws the LinkedIn fold and checks the two things the brief calls mandatory (the tracked link, and the partnership disclosure) before anything is sent.',
  },
  {
    id: 'payouts',
    patterns: ['when do creators get paid', 'how do payouts work', 'payment terms', 'when is money released'],
    // 'when' carries the whole distinction from price-by-size.
    keywords: ['payout', 'paid', 'payment', 'release', 'invoice', 'money', 'when', 'creator'],
    answer:
      'The fee is committed when the creator accepts, scheduled when you approve their draft, and released when the campaign completes.\n\nApproval is the gate — nothing is owed for a post you never signed off. No invoicing from the creator either; the fee was agreed before booking.\n\nWorth saying plainly: payments here are represented, not processed. No payment provider is connected to this build.',
    links: [{ label: 'The payout ledger', href: '/payouts' }],
  },
  {
    id: 'messaging',
    patterns: ['can i message creators', 'how do i talk to them', 'messaging', 'contact a creator'],
    keywords: ['message', 'messaging', 'talk', 'contact', 'chat', 'reply'],
    answer:
      'Yes — a thread opens for every collaboration. Threads belong to a collaboration rather than to a person, so if you are running two campaigns with the same creator those stay separate conversations.\n\nOne honest note: replies from the other side in this demo are generated locally and are labelled as generated in the transcript. Nobody is actually at the other end.',
    links: [{ label: 'Open messages', href: '/messages' }],
  },

  /* ---- Creator side ---- */
  {
    id: 'creator-earn',
    role: 'creator',
    patterns: ['how do i get paid', 'how much can i earn', 'how do i make money', 'when do i get my money'],
    keywords: ['earn', 'paid', 'money', 'income', 'fee', 'earnings'],
    answer:
      'You set a flat fee per post. A brand books it at that price — no negotiating, no proposals.\n\nThe fee is locked when you accept, scheduled when the brand approves your draft, and released when the campaign completes. You never send an invoice.\n\nAdd a payout method so there is somewhere for it to go.',
    links: [
      { label: 'Your earnings', href: '/earnings' },
      { label: 'Set a payout method', href: '/payments' },
    ],
  },
  {
    id: 'creator-profile',
    role: 'creator',
    patterns: ['can i edit my profile', 'change my rate', 'update my bio', 'change my price'],
    keywords: ['profile', 'edit', 'bio', 'rate', 'price', 'headline', 'topics', 'availability'],
    answer:
      'You control how you describe yourself — headline, bio, positioning, topics, fee and availability.\n\nWhat you cannot edit is followers, engagement and median views. Those are measurements, not claims; a marketplace where the seller types their own audience numbers is not a marketplace.',
    links: [
      { label: 'Edit your profile', href: '/profile' },
      { label: 'Your media kit', href: '/media-kit' },
    ],
  },

  /* ---- Free tools ---- */
  {
    id: 'free-tools',
    patterns: ['what tools are there', 'free tools', 'calculators', 'what can i calculate'],
    keywords: ['tool', 'tools', 'calculator', 'calculate', 'free'],
    answer:
      'Five, all free and none of them need an account:\n\n• **Creator worth** — what a post from you is worth\n• **Engagement rate** — yours against the benchmark\n• **Delivery odds** — will an offer at this price actually get published\n• **Budget planner** — what a budget buys, after delivery rates\n• **Creator matching** — who fits a given brief\n\nThey compute instantly and locally. The equivalent on the real product is a 48-hour email.',
    links: [{ label: 'Open the tools', href: '/free-tools' }],
  },

  /* ---- Demo / meta ---- */
  {
    id: 'is-this-real',
    patterns: ['is this real', 'is this a demo', 'are these real creators', 'is the data real', 'real money'],
    keywords: ['real', 'demo', 'fake', 'genuine', 'actual', 'data'],
    answer:
      'It is a rebuild of a B2B creator marketplace, built as a technical assessment.\n\nAll creators, campaigns and metrics are generated demo data — no real people, companies or payments. Your session lives in this browser, not on a server.\n\nOne thing is genuinely real: tracked links record actual events. Open one and the campaign numbers move.',
  },
  {
    id: 'demo-account',
    patterns: ['how do i log in', 'what is the demo account', 'can i try it', 'do i need an account'],
    keywords: ['login', 'account', 'demo', 'try', 'password', 'sign'],
    answer:
      'Two ways in. **Open the demo workspace** on the sign-in page drops you into five campaigns already in flight with real attribution data — nothing to type.\n\nOr create an account, which starts genuinely empty. The empty states are part of the product and hiding them behind seed data would be a lie.',
    links: [{ label: 'Sign in', href: '/sign-in' }],
  },
  {
    id: 'who-are-you',
    patterns: ['who are you', 'what are you', 'are you ai', 'are you a bot', 'are you chatgpt'],
    keywords: ['you', 'bot', 'assistant', 'model', 'llm', 'yourself'],
    answer:
      'A robot with a filing cabinet, not a language model.\n\nThis build ships with no external APIs and no keys, so there is nothing to call. What I actually do is match your question against a hand-written knowledge base — tokenise it, expand synonyms, score every entry, return the best one with a confidence. If nothing scores well enough I say so rather than making something up.\n\nI can also read your workspace, so ask me what is waiting on you.',
  },

  /* ---- Live workspace ---- */
  {
    id: 'my-status',
    patterns: ['what is waiting on me', 'what should i do next', 'anything for me', 'what needs my attention', 'my status'],
    keywords: ['waiting', 'next', 'attention', 'todo', 'pending', 'status', 'mine'],
    answer: (ctx) => {
      if (!ctx.signedIn) {
        return 'You are not signed in, so there is nothing of yours to check yet. Open the demo workspace and I can tell you what is waiting.';
      }
      const bits: string[] = [];
      if (ctx.role === 'brand') {
        if (ctx.draftsWaiting) bits.push(`**${ctx.draftsWaiting} draft${ctx.draftsWaiting === 1 ? '' : 's'}** waiting on your approval — nothing publishes until you read them`);
        if (ctx.unreadMessages) bits.push(`**${ctx.unreadMessages} unread message${ctx.unreadMessages === 1 ? '' : 's'}**`);
        if (ctx.liveCampaigns) bits.push(`**${ctx.liveCampaigns}** campaign${ctx.liveCampaigns === 1 ? '' : 's'} live, ${eur(ctx.pipeline)} attributed so far`);
        if (ctx.shortlisted) bits.push(`**${ctx.shortlisted}** creator${ctx.shortlisted === 1 ? '' : 's'} shortlisted and not yet booked`);
      } else {
        if (ctx.openDeals) bits.push(`**${ctx.openDeals} deal${ctx.openDeals === 1 ? '' : 's'}** waiting on your answer`);
        if (ctx.unreadMessages) bits.push(`**${ctx.unreadMessages} unread message${ctx.unreadMessages === 1 ? '' : 's'}**`);
        if (ctx.creatorEarnings) bits.push(`**${eur(ctx.creatorEarnings)}** earned across your collaborations`);
      }
      if (!bits.length) return 'Nothing is waiting on you — everything is up to date.';
      return `Here is what is on your plate:\n\n${bits.map((b) => `• ${b}`).join('\n')}`;
    },
    links: [{ label: 'Go to the dashboard', href: '/dashboard' }],
  },
  {
    id: 'my-numbers',
    patterns: ['how are my campaigns doing', 'what is my pipeline', 'how many clicks', 'my performance', 'how am i doing'],
    keywords: ['pipeline', 'performance', 'numbers', 'results', 'doing', 'clicks', 'my'],
    answer: (ctx) => {
      if (!ctx.signedIn) return 'Sign in first and I can read your workspace. The demo workspace has five campaigns already running.';
      if (ctx.role === 'creator') {
        return `You have **${ctx.openDeals}** open deal${ctx.openDeals === 1 ? '' : 's'} and **${eur(ctx.creatorEarnings)}** across your collaborations.`;
      }
      if (!ctx.campaigns) return 'No campaigns yet — shortlist a few creators and turn that shortlist into one. The first brief takes about two minutes.';
      return `**${ctx.campaigns}** campaign${ctx.campaigns === 1 ? '' : 's'}, **${ctx.liveCampaigns}** live. ${eur(ctx.pipeline)} of attributed pipeline so far${ctx.clicks ? `, from ${ctx.clicks.toLocaleString('en-GB')} tracked clicks` : ''}.`;
    },
    links: [{ label: 'Open the dashboard', href: '/dashboard' }],
  },
];

/** Openers offered before the visitor has typed anything. */
export function suggestionsFor(ctx: AssistantContext): string[] {
  if (!ctx.signedIn) {
    return ['What is Vouch?', 'How much does it cost?', 'How does matching work?', 'Take me to the marketplace'];
  }
  if (ctx.role === 'creator') {
    return ['What is waiting on me?', 'How do I get paid?', 'Can I edit my profile?', 'Open my deals'];
  }
  return ['What is waiting on me?', 'How are my campaigns doing?', 'How does approval work?', 'Take me to pricing'];
}
