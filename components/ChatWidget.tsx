"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Compass,
  FileText,
  Headset,
  ListChecks,
  Newspaper,
  Scale,
  Send,
  ShieldCheck,
  ShieldUser,
  Tags,
  Trash2,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";

import Ic from "@/components/ui/Icon";
import Markdown from "@/components/Markdown";
import { sendLead } from "@/lib/leads";
import {
  pageContext,
  suggestRoutes,
  type PageContext,
  type RouteSuggestion,
} from "@/lib/site-nav";

/** Lucide equivalents for the Font Awesome class strings in lib/site-nav. */
const NAV_ICONS: Record<string, LucideIcon> = {
  "fa-solid fa-tags": Tags,
  "fa-solid fa-wand-magic-sparkles": WandSparkles,
  "fa-solid fa-list-check": ListChecks,
  "fa-solid fa-shield-halved": ShieldCheck,
  "fa-solid fa-scale-balanced": Scale,
  "fa-solid fa-newspaper": Newspaper,
  "fa-solid fa-briefcase": Briefcase,
  "fa-solid fa-headset": Headset,
  "fa-solid fa-trash-can": Trash2,
  "fa-solid fa-user-shield": ShieldUser,
  "fa-solid fa-file-contract": FileText,
};

type Msg = {
  from: "bot" | "user";
  text: string;
  error?: boolean;
  /** In-app navigation buttons surfaced under a bot reply. */
  nav?: RouteSuggestion[];
  /** The visitor's question; shown with a reply form so the team can answer. */
  ask?: string;
  animate?: boolean;
};

interface TypewriterTextProps {
  text: string;
  onComplete: () => void;
  onProgress: () => void;
}

function TypewriterText({ text, onComplete, onProgress }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const indexRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const intervalTime = 18; // ms per step
    // Granular step size: types exactly 1 letter at a time, scaling slightly for longer replies
    let charsPerStep = 1;
    if (text.length > 800) {
      charsPerStep = 3;
    } else if (text.length > 400) {
      charsPerStep = 2;
    }

    const timer = setInterval(() => {
      indexRef.current += charsPerStep;
      if (indexRef.current >= text.length) {
        setDisplayedText(text);
        clearInterval(timer);
        onCompleteRef.current();
      } else {
        setDisplayedText(text.slice(0, indexRef.current));
        onProgressRef.current();
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [text]);

  return <Markdown>{displayedText}</Markdown>;
}

const OPENED_KEY = "kauntech_chat_opened"; // user opened the panel this session
const DISMISS_KEY = "kauntech_teaser_dismissed"; // count of teaser dismissals
const SCROLL_TRIGGER = 0.35; // fraction of page scrolled that counts as "reading"
const MAX_DISMISSALS = 2; // stop nudging after this many dismissals/session

function ss(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function ssSet(key: string, val: string) {
  try {
    sessionStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

export default function ChatWidget() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showPresets, setShowPresets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [ctx, setCtx] = useState<PageContext>(() => pageContext("/"));
  const [teaser, setTeaser] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAnimating = messages.some((m) => m.animate);
  const isWide = messages.some((m) => m.text.length > 250 || m.text.includes("```") || m.text.includes("|"));

  const handleProgress = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const threshold = 120;
    const isNearBottom = el.scrollHeight - el.clientHeight - el.scrollTop < threshold;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const handleComplete = useCallback((index: number) => {
    setMessages((prev) =>
      prev.map((msg, idx) => (idx === index ? { ...msg, animate: false } : msg)),
    );
    setTimeout(() => {
      const el = bodyRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }, 50);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;

    if (busy) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.from === "user") {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    }
  }, [messages, busy, open]);

  // Keep the chat panel above the on-screen keyboard on phones so the user can
  // always see the input they're typing into. We size/position the panel to the
  // visual viewport (which shrinks when the keyboard opens). The near-fullscreen
  // mobile CSS is the fallback when visualViewport isn't available.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = windowRef.current;
    if (!vv || !el) return;

    const MARGIN = 12;
    const apply = () => {
      // Only take over layout in the mobile full-screen mode; leave desktop alone.
      if (!open || window.innerWidth > 560) {
        el.style.removeProperty("top");
        el.style.removeProperty("bottom");
        el.style.removeProperty("height");
        return;
      }
      el.style.top = vv.offsetTop + MARGIN + "px";
      el.style.bottom = "auto";
      el.style.height = vv.height - MARGIN * 2 + "px";
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      el.style.removeProperty("top");
      el.style.removeProperty("bottom");
      el.style.removeProperty("height");
    };
  }, [open]);

  // Resolve the context for the page the visitor is on. Blog articles get their
  // exact title from document.title (set per-page by Next metadata).
  useEffect(() => {
    const title =
      typeof document !== "undefined"
        ? document.title.replace(/\s*\|\s*Kauntech.*$/i, "").trim()
        : "";
    setCtx(pageContext(pathname, title));
  }, [pathname]);

  // Proactive teaser: gently expand from the icon once the visitor has spent
  // time (dwell) or scrolled into a page, asking about the current topic.
  // Respectful: once per path/session, never after they open the panel, and
  // it backs off entirely after a couple of dismissals.
  useEffect(() => {
    setTeaser(false);
    if (dwellTimer.current) clearTimeout(dwellTimer.current);

    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const dismissals = Number(ss(DISMISS_KEY) || "0");
    const eligible =
      ss(OPENED_KEY) !== "1" &&
      dismissals < MAX_DISMISSALS &&
      ss(`teaser:${pathname}`) !== "1";
    if (!eligible) return;

    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      window.removeEventListener("scroll", onScroll);
      // Re-check: the visitor may have opened the panel during the wait.
      if (ss(OPENED_KEY) === "1") return;
      ssSet(`teaser:${pathname}`, "1");
      setTeaser(true);
    };

    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0 && el.scrollTop / max >= SCROLL_TRIGGER) fire();
    };

    dwellTimer.current = setTimeout(fire, ctx.dwellMs);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname, ctx.dwellMs]);

  const openPanel = useCallback(() => {
    setTeaser(false);
    setOpen(true);
    ssSet(OPENED_KEY, "1");
  }, []);

  const dismissTeaser = useCallback(() => {
    setTeaser(false);
    ssSet(DISMISS_KEY, String(Number(ss(DISMISS_KEY) || "0") + 1));
  }, []);

  const submit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || isAnimating) return;
      setShowPresets(false);
      const asked = trimmed;
      setMessages((prev) => [...prev, { from: "user", text: asked }]);
      setInput("");
      setBusy(true);

      // The site is static, so there is no live assistant. A person on the team
      // answers: collect a reply address, and still suggest pages to read now.
      const nav = suggestRoutes(asked, pathname);
      setMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Good question. A person from our team answers these, usually within a few hours. Leave your name and email or WhatsApp number and we'll reply there.",
          nav: nav.length ? nav : undefined,
          ask: asked,
          animate: true,
        },
      ]);
      setBusy(false);
    },
    [busy, isAnimating, pathname],
  );

  const goTo = useCallback(
    (path: string) => {
      router.push(path);
      // Keep the panel open - the widget lives in the root layout, so the
      // conversation survives the client-side navigation.
    },
    [router],
  );

  return (
    <>
      {/* Proactive, contextual nudge that grows out of the launcher. */}
      {teaser && !open && (
        <div className="chat-teaser" role="dialog" aria-label="Ask the Kauntech team">
          <button
            className="chat-teaser-close"
            type="button"
            aria-label="Dismiss"
            onClick={dismissTeaser}
          >
            <Ic icon={X} />
          </button>
          <button className="chat-teaser-main" type="button" onClick={openPanel}>
            <span className="chat-teaser-avatar">
              <img
                src="/assets/Kauntech_logo.png"
                alt="Kauntech Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%", padding: "2px" }}
              />
            </span>
            <span className="chat-teaser-text">{ctx.nudge}</span>
          </button>
          <div className="chat-teaser-chips">
            {ctx.presets.slice(0, 2).map((p) => (
              <button
                key={p}
                type="button"
                className="chat-teaser-chip"
                onClick={() => {
                  openPanel();
                  submit(p);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className={`chat-widget-btn${teaser && !open ? " nudging" : ""}`}
        title="Ask the Kauntech team"
        aria-label="Ask the Kauntech team a question"
        onClick={openPanel}
        type="button"
        style={open ? { transform: "scale(0)", opacity: 0 } : undefined}
      >
        <span className="chat-widget-btn-avatar">
          <img
            src="/assets/Kauntech_logo.png"
            alt="Kauntech Logo"
            style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%", padding: "2px" }}
          />
        </span>
        <span className="chat-widget-btn-label">Ask Kauntech</span>
      </button>

      <div className={`chat-widget-window${open ? " active" : ""}${isWide ? " wide" : ""}`} ref={windowRef}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <img
                src="/assets/Kauntech_logo.png"
                alt="Kauntech Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%", padding: "2px" }}
              />
            </div>
            <div className="chat-title-box">
              <h4>Ask the Kauntech team</h4>
              <p>
                <span className="status-dot" style={{ display: "inline-block", animation: "none" }} />
                <span>Replies within a few hours</span>
              </p>
            </div>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)} type="button" aria-label="Close chat">
            <Ic icon={X} />
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          <div className="chat-msg bot">
            Hello! Questions about offline-first scanning, K-Tokens, pricing, or India&apos;s
            DPDP Act 2023? Ask us below. A person from our team replies, usually within a few
            hours.
            {showPresets && (
              <div className="chat-preset-chips">
                {ctx.presets.map((p) => (
                  <button
                    key={p}
                    className="preset-chip"
                    type="button"
                    disabled={busy || isAnimating}
                    onClick={() => submit(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.from}`}>
              {m.from === "bot" ? (
                <div className="chat-md">
                  {m.animate ? (
                    <TypewriterText
                      text={m.text}
                      onComplete={() => handleComplete(i)}
                      onProgress={handleProgress}
                    />
                  ) : (
                    <Markdown>{m.text}</Markdown>
                  )}
                </div>
              ) : (
                m.text
              )}
              {m.error && <AskForm question="" />}
              {!m.animate && m.ask && <AskForm question={m.ask} />}
              {!m.animate && m.nav && m.nav.length > 0 && (
                <div className="chat-nav-actions">
                  {m.nav.map((n) => (
                    <button
                      key={n.path}
                      type="button"
                      className="chat-nav-btn"
                      onClick={() => goTo(n.path)}
                    >
                      <Ic icon={NAV_ICONS[n.icon] ?? Compass} />
                      <span>{n.label}</span>
                      <Ic icon={ArrowRight} className="chat-nav-arrow" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="chat-msg bot" aria-live="polite">
              <span className="chat-typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>

        <form
          className="chat-input-box"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            disabled={busy || isAnimating}
            required
          />
          <button type="submit" disabled={busy || isAnimating || !input.trim()} aria-label="Send">
            <Ic icon={Send} />
          </button>
        </form>
      </div>
    </>
  );
}

/** Reply form under a question. Name plus email or WhatsApp, then it goes to the team. */
function AskForm({ question }: { question: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  if (state === "done")
    return (
      <div style={{ color: "#34d399", fontWeight: 700, marginTop: 12 }}>
        Got it. We&apos;ll reply to {contact.trim()} shortly.
      </div>
    );

  const isEmail = /@/.test(contact);
  const digits = contact.replace(/[^0-9]/g, "").length;
  const ok =
    name.trim().length >= 2 &&
    (isEmail ? /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.trim()) : digits >= 8 && digits <= 15);

  const send = async () => {
    if (!ok) return;
    setState("sending");
    try {
      await sendLead("chat", {
        name,
        email: isEmail ? contact : "",
        phone: isEmail ? "" : contact,
        reply_on: isEmail ? "Email" : "WhatsApp",
        question,
      });
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="chat-fallback-form" style={{ marginTop: 12 }}>
      <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input
        type="text"
        inputMode="email"
        placeholder="Email or WhatsApp number"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        required
      />
      {state === "error" ? (
        <div style={{ color: "#f87171", fontSize: 13, marginBottom: 6 }}>
          Couldn&apos;t send. Please email business@voltairtech.com.
        </div>
      ) : null}
      <button type="button" onClick={send} disabled={state === "sending" || !ok}>
        {state === "sending" ? "Sending…" : "Send my question"}
      </button>
    </div>
  );
}
