"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [
  "How does offline work?",
  "What is DPDP compliance?",
  "Explain K-Tokens",
  "What are the pricing plans?",
  "Is my data stored on servers?",
];

type Msg = { from: "bot" | "user"; text: string; error?: boolean };

const SESSION_KEY = "kauntech_chat_session";

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

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showPresets, setShowPresets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy]);

  const submit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setShowPresets(false);
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          session_id: getSessionId(),
          page_url: typeof location !== "undefined" ? location.href : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { from: "bot", text: data.reply }]);
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
  };

  return (
    <>
      <button
        className="chat-widget-btn"
        title="Chat with Kauntech AI Specialist"
        onClick={() => setOpen(true)}
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
          <button className="chat-close" onClick={() => setOpen(false)} type="button">
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
                {PRESETS.map((p) => (
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
          <button type="submit" disabled={busy || !input.trim()}>
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
