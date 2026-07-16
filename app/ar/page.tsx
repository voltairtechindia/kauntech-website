import { redirect } from "next/navigation";
import QRCode from "qrcode";
import ArHeader from "@/components/ar/ArHeader";
import ArShowcaseLazy from "@/components/ar/ArShowcaseLazy";
import CardsDashboard, { type CardStatus, type DashItem } from "@/components/ar/CardsDashboard";
import HowItWorks from "@/components/ar/HowItWorks";
import { IconScan } from "@/components/ar/icons";
import { getDashboardData, type OwnerCard } from "@/lib/ar/db";

export const dynamic = "force-dynamic";

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);

// Sanitize a card_color to a plain #RRGGBB (strip any alpha). Defaults to
// #F59E0B — the EXACT same fallback the app card uses (BusinessCardItem's
// `item.card_color || "#F59E0B"`) so the web card's accent matches mobile.
function toAccent(color?: string | null): string {
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}/.test(color)) return color.slice(0, 7);
  return "#F59E0B";
}

// Mirror the app's BusinessCardItem.buildVCard so a generated QR encodes the
// same payload the app shows (incl. the KaunTech card deep link the scanner
// resolves to this card + its AR model).
function buildVCard(c: OwnerCard): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${c.name ?? ""}`];
  if (c.title) lines.push(`TITLE:${c.title}`);
  if (c.company) lines.push(`ORG:${c.company}`);
  if (c.email) lines.push(`EMAIL:${c.email}`);
  if (c.phone) lines.push(`TEL:${c.phone}`);
  if (c.website) lines.push(`URL:${c.website}`);
  if (c.id) lines.push(`URL;type=KaunTech:https://www.kauntech.com/card/${c.id}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

// QR source for the card face, mirroring the app: a custom QR IMAGE (uploaded
// via mobile, stored as an http url in custom_qr_url) is shown as is; a
// `qrtext:` sentinel renders its text; otherwise we generate the vCard QR.
// `generated` is true only for QRs we draw ourselves — the center K logo is
// overlaid on those, but never on a user's custom image (which is shown as-is,
// exactly like the app). Generated QRs are inlined as an SVG data URL.
async function qrFor(c: OwnerCard): Promise<{ src: string | null; generated: boolean }> {
  const custom = c.custom_qr_url;
  // Plain test (not the isHttp type guard) so `custom` keeps its string|null
  // type for the qrtext branch — a non-http custom QR is still a valid string.
  if (custom && /^https?:\/\//i.test(custom)) return { src: custom, generated: false };
  const text = custom && custom.startsWith("qrtext:") ? custom.slice("qrtext:".length) : buildVCard(c);
  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#09090B", light: "#FFFFFF" },
    });
    return { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, generated: true };
  } catch {
    return { src: null, generated: false };
  }
}

export default async function ArDashboard() {
  const data = await getDashboardData();
  if (!data) redirect("/ar/login");

  const { email, tier, arCap, storageUsedBytes, storageCapBytes, tokensUsed, tokensLimit, tokenBreakdown, tokensResetAt, cards, models, loadError } = data;
  const canAuthor = arCap > 0;

  const items: DashItem[] = await Promise.all(
    cards.map(async (card) => {
      const model = models[card.id];
      const status: CardStatus = !model ? "none" : model.is_published ? "published" : "draft";
      const qr = await qrFor(card);
      return {
        id: card.id,
        name: card.name || "Untitled card",
        subtitle: [card.title, card.company].filter(Boolean).join(" · "),
        status,
        qrSrc: qr.src,
        qrGenerated: qr.generated,
        phone: card.phone || null,
        email: card.email || null,
        website: card.website || null,
        accent: toAccent(card.card_color),
        avatarUrl: isHttp(card.avatar_url) ? card.avatar_url : null,
        isDefault: !!card.is_default,
        // Same vCard payload the card's QR encodes — the Share sheet turns it
        // into a downloadable .vcf and a high-res QR without another fetch.
        vcard: buildVCard(card),
      };
    }),
  );

  // Tell a failed read apart from a genuinely empty account so we never show a
  // misleading "No cards yet" when the cards just didn't load.
  const showLoadError = canAuthor && loadError && items.length === 0;

  return (
    <>
      <ArHeader email={email} />
      <div className="ar-container ar-dash-page">
        <div className="ar-dash-head">
          <div className="ar-dash-head-text">
            <h1 className="ar-h1" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              Your cards, <span className="ar-serif">beyond paper</span>
              {tier && (
                <span className={`ar-badge ar-badge-${tier}`} style={{ fontSize: "11px", padding: "2px 8px", textTransform: "uppercase" }}>
                  {tier}
                </span>
              )}
            </h1>
            <p className="ar-sub" style={{ margin: "6px 0 0" }}>
              Design what appears when someone scans your printed card — 3D models, buttons, text and video, live in augmented reality.
            </p>
          </div>
          <div className="ar-dash-actions">
            {/* The app's AR playground: point a camera at any KaunTech card QR
                to jump straight into its live AR experience. */}
            <a className="ar-btn ar-btn-ghost ar-btn-sm" href="/ar/play" target="_blank" rel="noreferrer" title="Open the AR scanner — point it at any KaunTech card">
              <IconScan /> Scan a card
            </a>
          </div>
        </div>

        <HowItWorks />

        {!canAuthor ? (
          <div className="ar-card ar-gate">
            {/* Show what they'd unlock: the live 3D scanning vignette. */}
            <ArShowcaseLazy compact />
            <h2 className="ar-h2">AR cards are a Pro / Ultra feature</h2>
            <p className="ar-sub" style={{ margin: "0 0 var(--ar-sp-lg)" }}>
              Upgrade in the KaunTech app to unlock custom 3D and augmented reality features for your business card.
            </p>
            <a className="ar-btn ar-btn-primary" href="https://www.kauntech.com/get">
              Get the app to upgrade
            </a>
          </div>
        ) : showLoadError ? (
          <div className="ar-card" style={{ textAlign: "center" }}>
            <h2 className="ar-h2">Couldn&apos;t load your cards</h2>
            <p className="ar-sub" style={{ margin: "0 0 var(--ar-sp-lg)" }}>
              Your session may have expired. Try again — your cards aren&apos;t affected.
            </p>
            <a className="ar-btn ar-btn-primary" href="/ar">
              Try again
            </a>
          </div>
        ) : (
          <CardsDashboard
            tier={tier}
            arCap={arCap}
            items={items}
            storageUsedBytes={storageUsedBytes}
            storageCapBytes={storageCapBytes}
            tokensUsed={tokensUsed}
            tokensLimit={tokensLimit}
            tokenBreakdown={tokenBreakdown}
            tokensResetAt={tokensResetAt}
          />
        )}
      </div>
    </>
  );
}
