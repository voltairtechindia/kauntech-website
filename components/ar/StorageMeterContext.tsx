"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { TokenBreakdown } from "@/lib/ar/db";

/**
 * Lets the editor publish its LIVE storage + token figures (which tick up as
 * assets are uploaded / cards are built) so the navbar — rendered above the
 * editor in the tree — can show them. Pages that render <ArHeader/> without this
 * provider (the /ar dashboard, login) just get `null` and keep their normal
 * account area.
 */
type Snapshot = { used: number; cap: number; label: string } | null;
type TokenSnapshot = { used: number; limit: number; breakdown: TokenBreakdown; resetAt: string | null } | null;

interface StorageMeterCtx {
  meter: Snapshot;
  publish: (used: number, cap: number, label: string) => void;
  tokens: TokenSnapshot;
  publishTokens: (used: number, limit: number, breakdown: TokenBreakdown, resetAt: string | null) => void;
}

const Ctx = createContext<StorageMeterCtx | null>(null);

export function StorageMeterProvider({ children }: { children: ReactNode }) {
  const [meter, setMeter] = useState<Snapshot>(null);
  const [tokens, setTokens] = useState<TokenSnapshot>(null);
  // Equality-guarded so re-publishing the same figure is a no-op — avoids a
  // publish → re-render → publish loop with the editor's effect.
  const publish = useCallback((used: number, cap: number, label: string) => {
    setMeter((prev) =>
      prev && prev.used === used && prev.cap === cap && prev.label === label
        ? prev
        : { used, cap, label },
    );
  }, []);
  const publishTokens = useCallback(
    (used: number, limit: number, breakdown: TokenBreakdown, resetAt: string | null) => {
      setTokens((prev) =>
        prev && prev.used === used && prev.limit === limit && prev.resetAt === resetAt
          ? prev
          : { used, limit, breakdown, resetAt },
      );
    },
    [],
  );
  return <Ctx.Provider value={{ meter, publish, tokens, publishTokens }}>{children}</Ctx.Provider>;
}

export function useStorageMeter() {
  return useContext(Ctx);
}
