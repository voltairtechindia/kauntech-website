"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The chat widget (and its react-markdown / remark-gfm dependencies) is the
// heaviest client bundle on the page, yet the panel starts closed. Loading it
// eagerly added ~0.7s of main-thread work during hydration, which Lantern (the
// PSI simulator) scales 4x for CPU throttling — inflating mobile LCP. We defer
// the whole widget until the browser is idle or the user first interacts, so it
// never sits on the initial render/hydration critical path. Its scroll-teaser
// behaviour is preserved (listeners attach once it mounts, ~1.5s in).
const ChatWidget = dynamic(() => import("./ChatWidget"), { ssr: false });

export default function DeferredChatWidget() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reveal = () => setShow(true);

    // Load on the first real engagement signal (scroll / tap / key / move).
    // This keeps the chat bundle off the initial load + hydration path entirely
    // — the widget's own teaser only nudges after ~35% scroll anyway, so users
    // get it exactly when they start engaging. A long safety timeout guarantees
    // it still appears for a visitor who never interacts.
    const events: (keyof WindowEventMap)[] = [
      "scroll",
      "pointerdown",
      "keydown",
      "touchstart",
      "mousemove",
    ];
    const opts: AddEventListenerOptions = { once: true, passive: true };
    events.forEach((e) => window.addEventListener(e, reveal, opts));
    const timer = setTimeout(reveal, 8000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, reveal));
      clearTimeout(timer);
    };
  }, []);

  return show ? <ChatWidget /> : null;
}
