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
          <h1 className="ar-h1" style={{ margin: 0 }}>Your AR cards</h1>
          <p className="ar-sub" style={{ margin: "4px 0 0" }}>
            Attach a 3D model, image or video to a card — it appears anchored on
            top when someone scans the card in the KaunTech app.
          </p>
        </div>

        {!canAuthor ? (
          <div className="ar-card">
            <h2 className="ar-h2">AR cards are a Pro / Ultra feature</h2>
            <p className="ar-sub" style={{ margin: "0 0 var(--ar-sp-lg)" }}>
              Upgrade in the KaunTech app to unlock AR for your business card.
            </p>
            <a className="ar-btn ar-btn-primary" href="https://www.kauntech.com/get">
              Get the app
            </a>
          </div>
        ) : cards.length === 0 ? (
          <div className="ar-card">
            <p className="ar-sub" style={{ margin: 0 }}>
              You don’t have any cards yet. Create one in the KaunTech app first,
              then come back to add AR.
            </p>
          </div>
        ) : (
          <CardsDashboard tier={tier} arCap={arCap} items={items} />
        )}
      </div>
    </>
  );
}
