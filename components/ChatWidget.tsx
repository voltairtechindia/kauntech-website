"use client";

import { useEffect, useRef, useState } from "react";

const PRESETS = [
  "How does offline work?",
  "What is DPDP compliance?",
  "Explain AI tokens",
  "What are the pricing plans?",
  "Is my data stored on servers?",
];

type Msg = { from: "bot" | "user"; text: string; fallback?: boolean };

function responseFor(input: string): { text: string; fallback?: boolean } {
  const m = input.toLowerCase();
  if (m.includes("offline"))
    return {
      text: "Kauntech works 100% offline! OCR, audio notes, and data storage happen securely on your device. We sync to the cloud only when you reconnect.",
    };
  if (m.includes("dpdp") || m.includes("compliance"))
    return {
      text: "We are fully DPDP Act 2023 compliant. We record specific consent, process data locally, and offer a transparent audit ledger. We don't save your images or contacts on our servers.",
    };
  if (m.includes("token") || m.includes("ai"))
    return {
      text: "AI Tokens power our advanced features. AI Intel costs 2 tokens per scan. Pro plans include 1,000 tokens monthly. You can also earn free tokens by following our social media pages and competing in our community Q&A if you are a Pro or Ultra user!",
    };
  if (m.includes("price") || m.includes("cost") || m.includes("plan"))
    return {
      text: "We offer flexible plans: Free (49 scans), Pro (₹499/mo), Ultra (₹999/mo), and Custom enterprise suites. Top-ups are also available anytime.",
    };
  if (m.includes("data") || m.includes("stored") || m.includes("server"))
    return {
      text: "We do not save or store your scanned images or contact details on our servers. Your data belongs to you and stays securely on your device until you decide to sync it to your own CRM.",
    };
  return {
    text: "I'm sorry, I cannot answer that specific question right now. Please provide your details, and our admin will revert back to your email ID shortly.",
    fallback: true,
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showPresets, setShowPresets] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setShowPresets(false);
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setTimeout(() => {
      const r = responseFor(trimmed);
      setMessages((prev) => [...prev, { from: "bot", text: r.text, fallback: r.fallback }]);
    }, 500);
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
            architecture, AI Tokens economy, or India&apos;s DPDP Act 2023 compliance? Choose a
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
              {m.fallback && <FallbackForm />}
            </div>
          ))}
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
            required
          />
          <button type="submit">
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
