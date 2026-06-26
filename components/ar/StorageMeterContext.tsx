"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * Lets the editor publish its LIVE storage figure (which ticks up as assets are
 * uploaded) so the navbar — rendered above the editor in the tree — can show it.
 * Pages that render <ArHeader/> without this provider (the /ar dashboard, login)
 * just get `null` and keep their normal account area.
 */
type Snapshot = { used: number; cap: number; label: string } | null;

interface StorageMeterCtx {
  meter: Snapshot;
  publish: (used: number, cap: number, label: string) => void;
}

const Ctx = createContext<StorageMeterCtx | null>(null);

export function StorageMeterProvider({ children }: { children: ReactNode }) {
  const [meter, setMeter] = useState<Snapshot>(null);
  // Equality-guarded so re-publishing the same figure is a no-op — avoids a
  // publish → re-render → publish loop with the editor's effect.
  const publish = useCallback((used: number, cap: number, label: string) => {
    setMeter((prev) =>
      prev && prev.used === used && prev.cap === cap && prev.label === label
        ? prev
        : { used, cap, label },
    );
  }, []);
  return <Ctx.Provider value={{ meter, publish }}>{children}</Ctx.Provider>;
}

export function useStorageMeter() {
  return useContext(Ctx);
}
