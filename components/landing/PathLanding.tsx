"use client";

import { useEffect, useState, type ReactNode } from "react";

import CardOpenClient from "./CardOpenClient";
import RedirectClient from "./RedirectClient";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERRAL = /^KT-[A-HJ-NP-Z2-9]{6}$/;

type Landing = { kind: "card"; id: string } | { kind: "referral"; code: string } | { kind: "none" };

function landingFor(pathname: string): Landing {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 2 && parts[0] === "card" && UUID.test(parts[1])) {
    return { kind: "card", id: parts[1] };
  }
  if (parts.length === 2 && parts[0] === "r") {
    const code = decodeURIComponent(parts[1]).toUpperCase();
    if (REFERRAL.test(code)) return { kind: "referral", code };
  }
  return { kind: "none" };
}

/**
 * GitHub Pages serves the 404 page for any path it has no file for, which
 * includes the per-card and per-referral links the app hands out
 * (/card/<uuid>, /r/KT-XXXXXX). This picks those out in the browser and shows
 * the same landing the server routes used to; anything else stays a 404.
 */
export default function PathLanding({
  iosUrl,
  androidUrl,
  children,
}: {
  iosUrl: string;
  androidUrl: string;
  children: ReactNode;
}) {
  const [landing, setLanding] = useState<Landing | null>(null);

  useEffect(() => {
    setLanding(landingFor(window.location.pathname));
  }, []);

  if (landing?.kind === "card") {
    return <CardOpenClient cardId={landing.id} iosUrl={iosUrl} androidUrl={androidUrl} />;
  }
  if (landing?.kind === "referral") {
    return <RedirectClient code={landing.code} iosUrl={iosUrl} androidUrl={androidUrl} />;
  }
  return <>{children}</>;
}
