"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import { APP_SUPABASE_ANON_KEY, APP_SUPABASE_URL } from "@/lib/ar/appAuthBrowser";
import { buildViewer } from "@/lib/ar/viewerModel";

/**
 * Public WebAR viewer, loaded by the app's WebView for a card.
 *
 * Old links look like /ar/view/<cardId>. GitHub Pages has no file for that, so
 * the 404 page sends them here as /ar/view?card=<cardId> (keeping any other
 * query, e.g. ?worldtracking=0). This page asks the app's Supabase for the
 * card's scene with the public anon key (the same call the server route made),
 * then swaps the whole document for the standalone 8th Wall viewer.
 */
export default function ArViewerPage() {
  const [message, setMessage] = useState("Loading AR…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardId = (params.get("card") || "").trim();
    if (!cardId) {
      setMessage("This AR link is missing its card.");
      return;
    }
    if (!APP_SUPABASE_URL || !APP_SUPABASE_ANON_KEY) {
      setMessage("AR isn’t configured.");
      return;
    }
    const supabase = createClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    supabase
      .rpc("resolve_ar_model_for_card", { p_card_id: cardId })
      .then(({ data, error }) => {
        if (error) {
          setMessage("This card doesn’t have an AR experience yet.");
          return;
        }
        const out = buildViewer(data, cardId, params.get("worldtracking") !== "0");
        if ("message" in out) {
          setMessage(out.message);
          return;
        }
        document.open();
        document.write(out.html);
        document.close();
      });
  }, []);

  return (
    <main
      style={{
        margin: 0,
        background: "#0B0D12",
        color: "#e6edf3",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        padding: 24,
      }}
    >
      <p>{message}</p>
    </main>
  );
}
