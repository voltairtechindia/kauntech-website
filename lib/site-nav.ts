/**
 * Site navigation map for the chat widget.
 *
 * Two jobs, both client-safe (no server imports):
 *  1. `suggestRoutes(text)` — turn what a visitor asked / the bot answered into
 *     in-app navigation buttons ("Open Contact →"). Pure keyword matching, so it
 *     adds zero Gemini cost and works even on cached replies.
 *  2. `pageContext(pathname)` — describe the page the visitor is on right now so
 *     the widget can offer a contextual nudge + presets ("Need help with …?").
 */

export interface SitePage {
  path: string;
  label: string;
  /** Font Awesome class for the nav button icon. */
  icon: string;
  /** Lowercased trigger words/phrases. Multi-word phrases are matched as-is. */
  keywords: string[];
}

/**
 * Suggestable destinations, ordered by priority (used as the tie-breaker when
 * two pages match the same number of keywords). Home is intentionally absent —
 * "go home" is rarely a useful CTA from a chat answer.
 */
export const SITE_PAGES: SitePage[] = [
  {
    path: "/pricing",
    label: "Pricing & Top-Ups",
    icon: "fa-solid fa-tags",
    keywords: [
      "pricing", "price", "prices", "cost", "costs", "how much", "plan", "plans",
      "subscription", "subscribe", "billing", "upgrade", "free trial", "trial",
      "get started", "download", "get the app", "k-token", "k tokens", "ktoken",
      "tokens", "top-up", "top up", "topup", "rupees", "per month", "annual",
    ],
  },
  {
    path: "/features",
    label: "Features",
    icon: "fa-solid fa-wand-magic-sparkles",
    keywords: [
      "feature", "features", "capabilities", "what can it do", "ocr",
      "scan", "scanning", "capture", "enrich", "enrichment", "ai enrichment",
      "lead scoring", "icebreaker", "automation", "nfc", "qr", "what does it do",
    ],
  },
  {
    path: "/how-it-works",
    label: "How It Works",
    icon: "fa-solid fa-list-check",
    keywords: [
      "how it works", "how does it work", "workflow", "steps", "step by step",
      "getting started", "set up", "setup", "onboard", "onboarding",
      "how do i start", "first scan", "walkthrough",
    ],
  },
  {
    path: "/compliance",
    label: "DPDP Compliance",
    icon: "fa-solid fa-shield-halved",
    keywords: [
      "dpdp", "compliance", "compliant", "data protection", "privacy law",
      "regulation", "regulatory", "audit ledger", "consent", "gdpr",
    ],
  },
  {
    path: "/compare",
    label: "Compare",
    icon: "fa-solid fa-scale-balanced",
    keywords: [
      "compare", "comparison", "versus", "alternative", "alternatives",
      "competitor", "competitors", "difference", "different from", "better than",
    ],
  },
  {
    path: "/blog",
    label: "Blog",
    icon: "fa-solid fa-newspaper",
    keywords: ["blog", "article", "articles", "guide", "guides", "read more", "posts"],
  },
  {
    path: "/career",
    label: "Careers",
    icon: "fa-solid fa-briefcase",
    keywords: [
      "career", "careers", "job", "jobs", "hiring", "hire", "vacancy",
      "vacancies", "apply for", "work with you", "recruit", "open role",
      "open roles", "position", "opening",
    ],
  },
  {
    path: "/contact",
    label: "Contact",
    icon: "fa-solid fa-headset",
    keywords: [
      "contact", "support", "talk to", "talk to sales", "sales", "demo",
      "book a demo", "get in touch", "reach you", "reach out", "email you",
      "phone", "call you", "enquiry", "inquiry", "speak to", "help me",
    ],
  },
  {
    path: "/delete-request",
    label: "Delete My Data",
    icon: "fa-solid fa-trash-can",
    keywords: [
      "delete my data", "data deletion", "delete request", "erase my data",
      "erasure", "right to be forgotten", "delete my account", "remove my data",
    ],
  },
  {
    path: "/privacy",
    label: "Privacy Policy",
    icon: "fa-solid fa-user-shield",
    keywords: ["privacy policy", "your privacy", "data policy"],
  },
  {
    path: "/terms",
    label: "Terms of Service",
    icon: "fa-solid fa-file-contract",
    keywords: ["terms", "terms of service", "terms and conditions"],
  },
];

export interface RouteSuggestion {
  path: string;
  label: string;
  icon: string;
}

/** True when `keyword` appears in `text` as a whole word / phrase. */
function hasKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Boundaries are "not a letter/digit" so short words ("qr") don't match
  // inside larger ones ("square"), while phrases ("how it works") still match.
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

/**
 * Rank pages by how strongly `text` (the visitor's question + the bot's reply)
 * points at them, and return the top matches as ready-to-render nav buttons.
 * `currentPath` is excluded — never suggest the page they're already on.
 */
export function suggestRoutes(
  text: string,
  currentPath?: string,
  max = 2,
): RouteSuggestion[] {
  const haystack = ` ${text.toLowerCase()} `;
  const scored = SITE_PAGES.map((page, order) => {
    let score = 0;
    for (const kw of page.keywords) if (hasKeyword(haystack, kw)) score += 1;
    return { page, score, order };
  })
    .filter((s) => s.score > 0 && s.page.path !== normalizePath(currentPath))
    .sort((a, b) => b.score - a.score || a.order - b.order);

  return scored.slice(0, max).map(({ page }) => ({
    path: page.path,
    label: page.label,
    icon: page.icon,
  }));
}

function normalizePath(path?: string): string {
  if (!path) return "";
  const clean = path.split(/[?#]/)[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
}

export interface PageContext {
  /** Human topic name for the nudge, e.g. "pricing & plans". */
  topic: string;
  /** The proactive line shown in the expanded teaser. */
  nudge: string;
  /** Contextual quick questions for both the teaser and the open panel. */
  presets: string[];
  /** Dwell (ms) before the teaser auto-expands on this page. */
  dwellMs: number;
}

const DEFAULT_CONTEXT: PageContext = {
  topic: "Kauntech",
  nudge: "New to Kauntech? I can explain how we scan business cards 100% offline.",
  presets: [
    "How does offline scanning work?",
    "What are the pricing plans?",
    "Is Kauntech DPDP compliant?",
  ],
  dwellMs: 20000,
};

const CONTEXT_BY_PATH: Record<string, PageContext> = {
  "/": DEFAULT_CONTEXT,
  "/features": {
    topic: "the features",
    nudge: "Exploring what Kauntech can do? Ask me about OCR, AI enrichment or automation.",
    presets: [
      "What can the AI enrichment do?",
      "How does the offline OCR work?",
      "Which features are coming soon?",
    ],
    dwellMs: 22000,
  },
  "/how-it-works": {
    topic: "getting started",
    nudge: "Want a quick walkthrough? I can explain the 3-step workflow.",
    presets: [
      "How do I scan my first card?",
      "How fast is a single scan?",
      "Does setup need the internet?",
    ],
    dwellMs: 18000,
  },
  "/compliance": {
    topic: "DPDP compliance",
    nudge: "Questions about data protection? Ask me anything about DPDP Act 2023 compliance.",
    presets: [
      "Is Kauntech DPDP compliant?",
      "Where is my scanned data stored?",
      "What does the audit ledger record?",
    ],
    dwellMs: 22000,
  },
  "/compare": {
    topic: "how Kauntech compares",
    nudge: "Weighing your options? I can explain what sets Kauntech apart.",
    presets: [
      "Why does 100% offline matter?",
      "What makes Kauntech different?",
      "Is my data safer with Kauntech?",
    ],
    dwellMs: 20000,
  },
  "/pricing": {
    topic: "pricing & plans",
    nudge: "Comparing plans? I can help you pick the right one and explain K-Tokens.",
    presets: [
      "What's included in the Free plan?",
      "Pro vs Ultra — what's the difference?",
      "What exactly are K-Tokens?",
    ],
    dwellMs: 16000,
  },
  "/blog": {
    topic: "the Kauntech blog",
    nudge: "Looking for something specific? I can point you to the right read.",
    presets: [
      "Summarise Kauntech in 30 seconds",
      "How does Kauntech work?",
      "What should I read first?",
    ],
    dwellMs: 22000,
  },
  "/career": {
    topic: "careers at Kauntech",
    nudge: "Thinking about joining us? Ask me about open roles and how to apply.",
    presets: [
      "What roles are open right now?",
      "How do I apply for a job?",
      "What's it like to work at Kauntech?",
    ],
    dwellMs: 20000,
  },
  "/contact": {
    topic: "getting in touch",
    nudge: "Need to reach us? I can help right here, or point you the right way.",
    presets: [
      "How do I contact support?",
      "Can I book a demo?",
      "What's the fastest way to get help?",
    ],
    dwellMs: 16000,
  },
  "/delete-request": {
    topic: "deleting your data",
    nudge: "Want your data removed? I can explain how the erasure request works.",
    presets: [
      "How do I delete my data?",
      "How long does erasure take?",
      "Is Kauntech DPDP compliant?",
    ],
    dwellMs: 18000,
  },
  "/privacy": {
    topic: "your privacy",
    nudge: "Questions about how we handle data? I'm happy to explain in plain language.",
    presets: [
      "What data does Kauntech collect?",
      "Is my scanned data sent to servers?",
      "Is Kauntech DPDP compliant?",
    ],
    dwellMs: 22000,
  },
  "/terms": {
    topic: "our terms",
    nudge: "Reading the fine print? Ask me to explain anything in plain language.",
    presets: [
      "What are the key terms?",
      "How does billing work?",
      "What are the pricing plans?",
    ],
    dwellMs: 22000,
  },
};

/**
 * Resolve the contextual nudge + presets for the current route. For blog
 * articles (`/blog/<slug>`) pass `articleTitle` (read from `document.title`)
 * so the nudge can name the exact piece the visitor is reading.
 */
export function pageContext(
  pathname: string,
  articleTitle?: string | null,
): PageContext {
  const path = normalizePath(pathname);

  if (path.startsWith("/blog/") && path !== "/blog") {
    const title = (articleTitle || "").trim();
    const topic = title || "this article";
    return {
      topic,
      nudge: title
        ? `Enjoying "${truncate(title, 60)}"? I can answer questions about it.`
        : "Enjoying the read? I can answer questions about this article.",
      presets: [
        "Summarise this article for me",
        "How does this relate to Kauntech?",
        "Give me the key takeaways",
      ],
      dwellMs: 28000,
    };
  }

  return CONTEXT_BY_PATH[path] ?? DEFAULT_CONTEXT;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
