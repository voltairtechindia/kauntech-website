import { RESOURCE_LABEL, inr, unallocated, type OrgView, type Resource } from "@/lib/enterpriseTypes";

/**
 * The plan year in four bars: how much of each pool is already handed out to
 * seats, and how much is still the owner's to give.
 *
 * Shared by Team, where it sits above the people it is about, and Overview,
 * where it answers "are we going to run out" without a second click. One
 * component so the two can never disagree about what "handed out" means.
 */

// What people burn first, first.
const COLUMN_ORDER: Resource[] = ["scans", "intel", "strategy", "tokens"];

export default function AllowanceStrip({
  view,
  title = "Yearly allowance",
  aside = "Handed out / bought",
}: {
  view: OrgView;
  title?: string;
  aside?: React.ReactNode;
}) {
  const free = unallocated(view);
  const handed = {} as Record<Resource, number>;
  for (const r of COLUMN_ORDER) handed[r] = view.org.pools[r] - free[r];

  return (
    <section className="ec-panel" aria-labelledby="pool-h">
      <div className="ec-panel-head">
        <h2 id="pool-h" className="ec-panel-title">{title}</h2>
        {aside ? <span className="ec-muted" style={{ fontSize: 13 }}>{aside}</span> : null}
      </div>
      <div className="ec-panel-body">
        <div className="ec-pools">
          {COLUMN_ORDER.map((r) => {
            const of = view.org.pools[r];
            const pct = of > 0 ? Math.min(100, Math.round((handed[r] / of) * 100)) : 0;
            return (
              <div key={r} className="ec-meter">
                <div className="ec-meter-top">
                  <span>{RESOURCE_LABEL[r]}</span>
                  <b>{inr(handed[r])} / {inr(of)}</b>
                </div>
                <div className="ec-meter-bar" aria-hidden><div className="ec-meter-fill" style={{ width: `${pct}%` }} /></div>
                <span className="ec-hint">{inr(free[r])} left to share</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
