import {
  DESTINATIONS,
  ENTRIES,
  type AssistantContext,
  type Destination,
  type Entry,
  type KnowledgeLink,
} from '@/lib/assistant/knowledge';

/**
 * The assistant's retrieval engine.
 *
 * No model, no API, no key - the constraint on this build rules all three out.
 * What it does instead is genuine information retrieval: normalise the
 * question, expand synonyms, score every knowledge entry by weighted term
 * overlap, and return the best match with a confidence.
 *
 * The design decision that matters is the threshold. Below it the engine says
 * it does not know and offers what it does cover, rather than returning the
 * least-bad entry. A retrieval bot that always answers is worse than one that
 * admits a gap, because the user cannot tell the two apart until the answer is
 * wrong.
 *
 * Everything here is pure and deterministic - same question, same answer -
 * which is what makes it testable (scripts/test-assistant.ts).
 */

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'do', 'does', 'did',
  'i', 'me', 'my', 'we', 'our', 'your', 'it', 'its', 'this', 'that', 'these', 'those',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as', 'and', 'or', 'but', 'if',
  'can', 'could', 'would', 'will', 'shall', 'may', 'might', 'must',
  'there', 'here', 'about', 'please', 'just', 'so', 'very', 'really', 'get', 'got',
  /*
    Question words carry no topic. Leaving them in made "what" the highest
    frequency token in the corpus, so any entry listing it as a keyword - or
    any pattern that reduced to it - absorbed unrelated questions.

    'who' is the exception and stays: it is what separates "who are you" from
    "who is this for". 'you' stays for the same reason.
  */
  'what', 'how', 'why', 'where', 'which', 'whose', 'whom',
]);

/*
  'when' and 'should' are deliberately NOT stopwords.

  "when do creators get paid" and "what should I pay a creator" reduce to the
  same two content tokens - creator, pay - and mean completely different
  things. The tense and the modal are the only signal separating a question
  about timing from a question about amount, so they are kept and the two
  entries claim them.
*/

/**
 * Synonyms fold onto a canonical term.
 *
 * This is what lets "what do you charge" reach the pricing entry, which never
 * uses the word "charge". Kept one-directional and small - a thesaurus that
 * maps everything to everything makes every question match every entry.
 */
const SYNONYMS: Record<string, string> = {
  charge: 'price', charges: 'price', cost: 'price', costs: 'price', pricing: 'price',
  expensive: 'price', cheap: 'price', fee: 'price', fees: 'price', rates: 'rate',
  influencer: 'creator', influencers: 'creator', creators: 'creator',
  brands: 'brand', company: 'brand', business: 'brand',
  post: 'post', posts: 'post', posting: 'post', content: 'post',
  campaigns: 'campaign', ad: 'campaign', ads: 'campaign', advert: 'campaign',
  measure: 'track', measured: 'track', measuring: 'track', tracking: 'track',
  tracked: 'track', analytics: 'track', roi: 'track', attribution: 'track',
  earn: 'earn', earning: 'earn', earnings: 'earn', income: 'earn', salary: 'earn',
  paid: 'pay', payment: 'pay', payments: 'pay', payout: 'pay', payouts: 'pay',
  approve: 'approval', approved: 'approval', approving: 'approval', approvals: 'approval',
  draft: 'draft', drafts: 'draft', revision: 'draft', revisions: 'draft',
  message: 'message', messages: 'message', messaging: 'message', dm: 'message',
  chat: 'message', inbox: 'message',
  signin: 'login', signup: 'register', account: 'account', accounts: 'account',
  tools: 'tool', calculator: 'tool', calculators: 'tool', calculate: 'tool',
  match: 'match', matching: 'match', matched: 'match', ranking: 'match', rank: 'match',
  works: 'work', working: 'work',
  much: 'much', many: 'much',
  bot: 'bot', chatbot: 'bot', robot: 'bot', ai: 'bot', gpt: 'bot', chatgpt: 'bot', llm: 'bot',
  free: 'free', gratis: 'free',
  followers: 'follower', audience: 'audience', reach: 'audience',
};

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => SYNONYMS[t] ?? t);
}

/* ------------------------------------------------------------------ *
 * Navigation intent
 * ------------------------------------------------------------------ */

const NAV_VERBS = /\b(go|goto|take|open|show|navigate|bring|jump|visit|see|view|head)\b/;

export interface NavigationIntent {
  destination: Destination;
  /** How strongly the phrasing asked to be moved, rather than told about. */
  explicit: boolean;
}

/**
 * Resolves "take me to pricing" to a route.
 *
 * Matches the longest destination term contained in the question, so
 * "new campaign" wins over "campaign" and the visitor lands on the builder
 * rather than the list.
 */
export function findDestination(question: string, ctx: AssistantContext): NavigationIntent | null {
  const q = ` ${question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const explicit = NAV_VERBS.test(q);

  let best: { destination: Destination; length: number } | null = null;

  for (const destination of DESTINATIONS) {
    if (destination.role && ctx.role && destination.role !== ctx.role) continue;
    if (destination.requiresAuth && !ctx.signedIn) continue;

    for (const term of destination.terms) {
      if (!q.includes(` ${term} `)) continue;
      if (!best || term.length > best.length) best = { destination, length: term.length };
    }
  }

  if (!best) return null;
  return { destination: best.destination, explicit };
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

/** Term overlap between the question and one entry, 0..1-ish. */
function scoreEntry(tokens: string[], entry: Entry): number {
  if (!tokens.length) return 0;

  const keywords = new Set(entry.keywords.flatMap((k) => tokenise(k)));
  // Patterns that reduce to nothing are dropped rather than scored: an empty
  // set would otherwise divide into a perfect match.
  const patternSets = entry.patterns
    .map((p) => new Set(tokenise(p)))
    .filter((set) => set.size > 0);

  /** Every query token this entry accounts for, by any route. */
  const covered = new Set<string>();

  let score = 0;
  for (const t of tokens) {
    if (keywords.has(t)) {
      score += 1;
      covered.add(t);
    }
  }

  /*
    Patterns are scored by the best single phrasing rather than the sum of all
    of them, so an entry does not win by listing many near-duplicates.
    Normalising by pattern length stops long patterns from dominating.
  */
  let bestPattern = 0;
  for (const set of patternSets) {
    let hits = 0;
    for (const t of tokens) {
      if (set.has(t)) {
        hits += 1;
        covered.add(t);
      }
    }
    bestPattern = Math.max(bestPattern, hits / set.size);
  }
  score += bestPattern * 2.2;

  /*
    Coverage is what stops a long unrelated question from scraping through on
    one incidental hit. "who won the world cup in 1998" shares exactly one
    token with anything here; without this it cleared the floor on that alone.
  */
  const coverage = covered.size / tokens.length;

  // Normalise by question length so a long question is not inherently a better
  // match for everything.
  return (score / Math.sqrt(tokens.length)) * coverage;
}

/* ------------------------------------------------------------------ *
 * The answer
 * ------------------------------------------------------------------ */

export type AnswerKind = 'answer' | 'navigate' | 'unknown';

export interface Answer {
  kind: AnswerKind;
  text: string;
  links: KnowledgeLink[];
  /** Set when the assistant wants to move the visitor. */
  navigateTo?: string;
  /** 0..1. Exposed so the UI can be honest about a weak match. */
  confidence: number;
  /** The entry that produced this, for tests and debugging. */
  entryId?: string;
}

/** Below this the engine says it does not know rather than guessing. */
export const CONFIDENCE_FLOOR = 0.62;

export function answer(question: string, ctx: AssistantContext): Answer {
  const trimmed = question.trim();
  if (!trimmed) {
    return { kind: 'unknown', text: 'Ask me anything about how this works.', links: [], confidence: 0 };
  }

  const tokens = tokenise(trimmed);

  /* ---- Navigation wins when it was asked for outright ---- */
  const nav = findDestination(trimmed, ctx);
  if (nav?.explicit) {
    return {
      kind: 'navigate',
      text: `Taking you to ${nav.destination.label}.`,
      links: [],
      navigateTo: nav.destination.href,
      confidence: 1,
    };
  }

  /* ---- Otherwise, retrieve ---- */
  const available = ENTRIES.filter((e) => !e.role || !ctx.role || e.role === ctx.role);
  const ranked = available
    .map((entry) => ({ entry, score: scoreEntry(tokens, entry) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];

  if (top && top.score >= CONFIDENCE_FLOOR) {
    const text = typeof top.entry.answer === 'function' ? top.entry.answer(ctx) : top.entry.answer;
    const links = [...(top.entry.links ?? [])];

    // A question that also named a page gets the offer to go there, without
    // being yanked off the page it was asked from.
    if (nav && !links.some((l) => l.href === nav.destination.href)) {
      links.push({ label: `Go to ${nav.destination.label}`, href: nav.destination.href });
    }

    return {
      kind: 'answer',
      text,
      links,
      confidence: Math.min(1, top.score / 1.6),
      entryId: top.entry.id,
    };
  }

  /* ---- A page was named but nothing else matched: offer to move ---- */
  if (nav) {
    return {
      kind: 'navigate',
      text: `I am not sure I follow, but ${nav.destination.label} might be what you want.`,
      links: [],
      navigateTo: nav.destination.href,
      confidence: 0.5,
    };
  }

  /* ---- Say so ---- */
  return {
    kind: 'unknown',
    text:
      'I do not know that one. I am a retrieval bot over a hand-written knowledge base, not a language model, so I would rather say so than invent something.\n\nI can cover pricing, how matching works, attribution, the review and payout flow, the free tools, and what is currently waiting on you.',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'The marketplace', href: '/marketplace' },
      { label: 'Free tools', href: '/free-tools' },
    ],
    confidence: top ? Math.min(1, top.score / 1.6) : 0,
  };
}
