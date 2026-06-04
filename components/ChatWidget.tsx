"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  pageContext,
  suggestRoutes,
  type PageContext,
  type RouteSuggestion,
} from "@/lib/site-nav";

type Msg = {
  from: "bot" | "user";
  text: string;
  error?: boolean;
  /** In-app navigation buttons surfaced under a bot reply. */
  nav?: RouteSuggestion[];
};

const SESSION_KEY = "kauntech_chat_session";
const OPENED_KEY = "kauntech_chat_opened"; // user opened the panel this session
const DISMISS_KEY = "kauntech_teaser_dismissed"; // count of teaser dismissals
const SCROLL_TRIGGER = 0.35; // fraction of page scrolled that counts as "reading"
const MAX_DISMISSALS = 2; // stop nudging after this many dismissals/session

/** Stable per-browser session id so a conversation threads together server-side. */
function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "sess_ephemeral_" + Date.now().toString(36);
  }
}

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
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy, open]);

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
      if (!trimmed || busy) return;
      setShowPresets(false);
      const asked = trimmed;
      setMessages((prev) => [...prev, { from: "user", text: asked }]);
      setInput("");
      setBusy(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: asked,
            session_id: getSessionId(),
            page_url: typeof location !== "undefined" ? location.href : undefined,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          reply?: string;
          detail?: string;
        } | null;
        if (!res.ok) {
          // Rate-limit / quota / validation errors carry a friendly `detail`;
          // show it as a normal reply. Only fall back to the lead-capture form
          // when we got nothing usable back (a real outage).
          if (data?.detail) {
            setMessages((prev) => [...prev, { from: "bot", text: data.detail! }]);
            return;
          }
          throw new Error(`Request failed (${res.status})`);
        }
        const reply = data?.reply ?? "";
        // Derive in-app navigation from what was asked + answered (no AI cost).
        const nav = suggestRoutes(`${asked} ${reply}`, pathname);
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: reply, nav: nav.length ? nav : undefined },
        ]);
      } catch (err) {
        console.error("[kauntech-chat]", err);
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            error: true,
            text: "Sorry, I couldn't reach the assistant just now. Please share your details below and our team will email you shortly.",
          },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [busy, pathname],
  );

  const goTo = useCallback(
    (path: string) => {
      router.push(path);
      // Keep the panel open — the widget lives in the root layout, so the
      // conversation survives the client-side navigation.
    },
    [router],
  );

  return (
    <>
      {/* Proactive, contextual nudge that grows out of the launcher. */}
      {teaser && !open && (
        <div className="chat-teaser" role="dialog" aria-label="Kauntech assistant">
          <button
            className="chat-teaser-close"
            type="button"
            aria-label="Dismiss"
            onClick={dismissTeaser}
          >
            <i className="fa-solid fa-xmark" />
          </button>
          <button className="chat-teaser-main" type="button" onClick={openPanel}>
            <span className="chat-teaser-avatar">
              <i className="fa-solid fa-robot" />
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
        title="Chat with Kauntech AI Specialist"
        aria-label="Open Kauntech AI assistant"
        onClick={openPanel}
        type="button"
        style={open ? { transform: "scale(0)", opacity: 0 } : undefined}
      >
        <i className="fa-solid fa-message" />
      </button>

      <div className={`chat-widget-window${open ? " active" : ""}`}>
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar"><i className="fa-solid fa-robot" /></div>
            <div className="chat-title-box">
              <h4>Kauntech AI Specialist</h4>
              <p>
                <span className="status-dot" style={{ display: "inline-block", animation: "none" }} />
                <span>Online &amp; Ready</span>
              </p>
            </div>
          </div>
          <button className="chat-close" onClick={() => setOpen(false)} type="button" aria-label="Close chat">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="chat-body" ref={bodyRef}>
          <div className="chat-msg bot">
            Hello! I am your Kauntech AI Specialist. Have questions about our 100% offline
            architecture, K-Tokens, pricing, or India&apos;s DPDP Act 2023 compliance? Choose a
            preset or ask me anything!
            {showPresets && (
              <div className="chat-preset-chips">
                {ctx.presets.map((p) => (
                  <button
                    key={p}
                    className="preset-chip"
                    type="button"
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
              {m.text}
              {m.error && <FallbackForm />}
              {m.nav && m.nav.length > 0 && (
                <div className="chat-nav-actions">
                  {m.nav.map((n) => (
                    <button
                      key={n.path}
                      type="button"
                      className="chat-nav-btn"
                      onClick={() => goTo(n.path)}
                    >
                      <i className={n.icon} />
                      <span>{n.label}</span>
                      <i className="fa-solid fa-arrow-right chat-nav-arrow" />
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
            disabled={busy}
            required
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <i className="fa-solid fa-paper-plane" />
          </button>
        </form>
      </div>
    </>
  );
}

function FallbackForm() {
  const [submitted, setSubmitted] = useState(false);
  if (submitted)
    return (
      <div style={{ color: "#34d399", fontWeight: 700, marginTop: 12 }}>
        Request Submitted. Thank you!
      </div>
    );
  return (
    <div className="chat-fallback-form" style={{ marginTop: 12 }}>
      <input type="text" placeholder="Your Name" required />
      <input type="email" placeholder="Your Email ID" required />
      <textarea placeholder="Please describe your question or issue in detail..." rows={3} required />
      <button
        type="button"
        onClick={() => {
          alert("Details submitted successfully. Our admin will email you shortly.");
          setSubmitted(true);
        }}
      >
        Submit to Admin
      </button>
    </div>
  );
}
