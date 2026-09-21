/**
 * The shapes a console page holds while its data is in flight.
 *
 * Each route's loading.tsx renders one of these, so a click on the side rail
 * paints the new page's frame immediately instead of leaving the old page on
 * screen while the server reads Postgres. Server components, no client code:
 * they are markup and CSS only.
 */

export function SkelText({ w = "100%", h = 14 }: { w?: number | string; h?: number }) {
  return <span className="ec-skel" style={{ width: typeof w === "number" ? `${w}px` : w, height: h }} />;
}

/** The page title block, which every console page starts with. */
export function SkelHead({ actions = 2 }: { actions?: number }) {
  return (
    <div className="ec-head">
      <div style={{ display: "grid", gap: 10 }}>
        <SkelText w={180} h={26} />
        <SkelText w={300} h={13} />
      </div>
      <div className="ec-head-actions">
        {Array.from({ length: actions }, (_, i) => <SkelText key={i} w={118} h={36} />)}
      </div>
    </div>
  );
}

export function SkelStats({ count = 4 }: { count?: number }) {
  return (
    <section className="ec-stats" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div className="ec-stat" key={i}>
          <SkelText w={120} h={13} />
          <SkelText w={86} h={30} />
          <SkelText w={100} h={12} />
        </div>
      ))}
    </section>
  );
}

/** A panel with a head and a few rows of the table it is about to show. */
export function SkelPanel({ rows = 5, toolbar = false }: { rows?: number; toolbar?: boolean }) {
  return (
    <section className="ec-panel" aria-hidden>
      {toolbar ? (
        <div className="ec-toolbar">
          <span className="ec-search"><SkelText h={38} /></span>
          <SkelText w={150} h={38} />
          <SkelText w={150} h={38} />
          <SkelText w={190} h={38} />
        </div>
      ) : (
        <div className="ec-panel-head"><SkelText w={140} h={15} /><SkelText w={90} h={13} /></div>
      )}
      <div className="ec-skel-rows">
        {Array.from({ length: rows }, (_, i) => (
          <div className="ec-skel-row" key={i}>
            <span className="ec-skel ec-skel--circle" />
            <div style={{ display: "grid", gap: 7, flex: 1, minWidth: 0 }}>
              <SkelText w={`${52 + ((i * 11) % 26)}%`} h={14} />
              <SkelText w={`${28 + ((i * 7) % 18)}%`} h={12} />
            </div>
            <SkelText w={64} h={22} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** What a whole console page looks like before its data lands. */
export default function PageSkeleton({
  stats,
  toolbar,
  rows = 6,
  actions = 2,
  side,
}: {
  stats?: boolean;
  toolbar?: boolean;
  rows?: number;
  actions?: number;
  /** A second, narrower panel beside the first, as the Overview has. */
  side?: boolean;
}) {
  return (
    <div className="ec-page" aria-busy="true" aria-live="polite">
      <span className="ec-sr">Loading…</span>
      <SkelHead actions={actions} />
      {stats ? <SkelStats /> : null}
      {side ? (
        <div className="ec-grid-2">
          <SkelPanel rows={rows} />
          <SkelPanel rows={3} />
        </div>
      ) : (
        <SkelPanel rows={rows} toolbar={toolbar} />
      )}
    </div>
  );
}
