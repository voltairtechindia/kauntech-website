import { redirect } from "next/navigation";
import ArHeader from "@/components/ar/ArHeader";
import CardsDashboard, { type CardStatus, type DashItem } from "@/components/ar/CardsDashboard";
import { getDashboardData } from "@/lib/ar/db";

export const dynamic = "force-dynamic";

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

export default async function ArDashboard() {
  const data = await getDashboardData();
  if (!data) redirect("/ar/login");

  const { email, tier, arCap, cards, models } = data;
  const canAuthor = arCap > 0;

  const items: DashItem[] = cards.map((card) => {
    const model = models[card.id];
    const status: CardStatus = !model ? "none" : model.is_published ? "published" : "draft";
    const sceneCard = (model?.scene as { card?: { frontUrl?: string; backUrl?: string } })?.card ?? {};
    const previewUrl =
      [model?.reference_image_path, sceneCard.frontUrl, sceneCard.backUrl].find(isHttp) ?? null;
    return {
      id: card.id,
      name: card.name || "Untitled card",
      subtitle: [card.title, card.company].filter(Boolean).join(" · "),
      status,
      previewUrl,
    };
  });

  return (
    <>
      <ArHeader email={email} />
      <div className="ar-container ar-dash-page">
        <div className="ar-dash-head">
          <h1 className="ar-h1" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            Your AR cards
            {tier && (
              <span className={`ar-badge ar-badge-${tier}`} style={{ fontSize: "11px", padding: "2px 8px", textTransform: "uppercase" }}>
                {tier}
              </span>
            )}
          </h1>
          <p className="ar-sub" style={{ margin: "6px 0 0" }}>
            Create immersive business cards that display 3D models, custom text, buttons, and videos in augmented reality.
          </p>
        </div>

        <div className="ar-context-card">
          <div className="ar-context-card-header">
            <span className="ar-context-title">
              <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              How AR business cards work
            </span>
            <span className="ar-muted" style={{ fontSize: "13.5px" }}>Attach 3D assets or media overlays to your physical card in three quick steps:</span>
          </div>
          <div className="ar-context-steps">
            <div className="ar-context-step">
              <div className="ar-step-number">1</div>
              <div className="ar-step-content">
                <strong>Upload Card Target</strong>
                <p>Upload a glare-free photo of your printed card to serve as the AR tracking reference target.</p>
              </div>
            </div>
            <div className="ar-context-step">
              <div className="ar-step-number">2</div>
              <div className="ar-step-content">
                <strong>Design your AR Scene</strong>
                <p>Position 3D models, active link buttons, videos, or floating text labels directly floating on top of your card layout.</p>
              </div>
            </div>
            <div className="ar-context-step">
              <div className="ar-step-number">3</div>
              <div className="ar-step-content">
                <strong>Scan & Experience</strong>
                <p>When someone scans your physical card via the KaunTech scanner or QR code, your virtual layout comes alive in 3D space.</p>
              </div>
            </div>
          </div>
        </div>

        {!canAuthor ? (
          <div className="ar-card">
            <h2 className="ar-h2">AR cards are a Pro / Ultra feature</h2>
            <p className="ar-sub" style={{ margin: "0 0 var(--ar-sp-lg)" }}>
              Upgrade in the KaunTech app to unlock custom 3D and augmented reality features for your business card.
            </p>
            <a className="ar-btn ar-btn-primary" href="https://www.kauntech.com/get">
              Get the app to upgrade
            </a>
          </div>
        ) : (
          <CardsDashboard tier={tier} arCap={arCap} items={items} />
        )}
      </div>
    </>
  );
}
