/**
 * Route-level loading UI for the AR dashboard. Shown by Next while the server
 * component fetches the owner's cards (force-dynamic, so every visit), giving an
 * on-brand skeleton instead of a blank flash. Rendered inside the .ar-root
 * layout, so the ar.css design tokens apply.
 */
export default function ArDashboardLoading() {
  return (
    <div className="ar-container ar-dash-page" aria-busy="true" aria-label="Loading your AR cards">
      <div className="ar-dash-head">
        <div className="ar-skel ar-skel-title" />
        <div className="ar-skel ar-skel-sub" />
      </div>

      <div className="ar-skel ar-skel-bar" />

      <div className="ar-grid ar-cardgrid" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="ar-tile ar-cardtile">
            <div className="ar-cardface">
              <div className="ar-skel-dark ar-skel-qr" />
              <div className="ar-skel-dark" style={{ height: 1 }} />
              <div className="ar-skel-dark ar-skel-idrow" />
              <div className="ar-skel-dark" style={{ height: 11, width: "60%" }} />
              <div className="ar-skel-dark" style={{ height: 11, width: "75%" }} />
            </div>
            <div className="ar-skel ar-skel-btn" />
          </div>
        ))}
      </div>
    </div>
  );
}
