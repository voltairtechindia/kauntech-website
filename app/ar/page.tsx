import Link from "next/link";
import { redirect } from "next/navigation";
import ArHeader from "@/components/ar/ArHeader";
import { getDashboardData } from "@/lib/ar/db";

export const dynamic = "force-dynamic";

export default async function ArDashboard() {
  const data = await getDashboardData();
  if (!data) redirect("/ar/login");

  const { email, tier, arCap, cards, models } = data;
  const usedCount = Object.values(models).length;
  const canAuthor = arCap > 0;

  return (
    <>
      <ArHeader email={email} />
      <div className="ar-container">
        <h1 className="ar-h1">Your AR cards</h1>
        <p className="ar-sub">
          Attach a 3D model to a card. When someone scans that card in the
          KaunTech app, your model appears anchored on top of it.
          {canAuthor ? (
            <>
              {" "}
              <span className="ar-mono">
                {usedCount}/{arCap}
              </span>{" "}
              used on your <strong>{tier}</strong> plan.
            </>
          ) : null}
        </p>

        {!canAuthor ? (
          <div className="ar-card" style={{ marginBottom: "var(--ar-sp-2xl)" }}>
            <h2 className="ar-h2">AR cards are a Pro / Ultra feature</h2>
            <p className="ar-sub" style={{ margin: "0 0 var(--ar-sp-lg)" }}>
              Upgrade in the KaunTech app to unlock AR for your business card.
            </p>
            <a className="ar-btn ar-btn-primary" href="https://www.kauntech.com/get">
              Get the app
            </a>
          </div>
        ) : null}

        {cards.length === 0 ? (
          <div className="ar-card">
            <p className="ar-sub" style={{ margin: 0 }}>
              You don’t have any cards yet. Create one in the KaunTech app first,
              then come back to add AR.
            </p>
          </div>
        ) : (
          <div className="ar-grid">
            {cards.map((card) => {
              const model = models[card.id];
              const status = !model ? "none" : model.is_published ? "published" : "draft";
              return (
                <div key={card.id} className="ar-card ar-stack">
                  <div className="ar-row ar-between">
                    <strong>{card.name || "Untitled card"}</strong>
                    {status === "published" ? (
                      <span className="ar-badge ar-badge-published">Live</span>
                    ) : status === "draft" ? (
                      <span className="ar-badge ar-badge-draft">Draft</span>
                    ) : (
                      <span className="ar-badge ar-badge-locked">No AR</span>
                    )}
                  </div>
                  <span className="ar-muted">
                    {[card.title, card.company].filter(Boolean).join(" · ") || "—"}
                  </span>
                  {canAuthor ? (
                    <Link
                      className={`ar-btn ${model ? "ar-btn-ghost" : "ar-btn-primary"}`}
                      href={`/ar/editor/${card.id}`}
                    >
                      {model ? "Edit AR" : "Set up AR"}
                    </Link>
                  ) : (
                    <button className="ar-btn ar-btn-ghost" disabled>
                      Locked
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
