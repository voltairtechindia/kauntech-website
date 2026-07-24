/**
 * Living app-screen mockups shown on the 3D iPhone (and the CSS phone fallback).
 * Rebuilt 1:1 from the real KaunTech app (kauntech-app repo, light theme -
 * the app's default): white #FFFFFF canvas, gold #D97706 accent, orange
 * #EA580C scan action, indigo #6366F1 AI layer, Fira Sans/Fira Code, lucide
 * stroke icons, floating glass tab bar with the orange Scan FAB. Every screen
 * is a fixed 390×844 composition, self-animating via CSS keyframes in
 * app/phone.css. Labels/strings are quoted from the app source.
 */

import type { ReactNode } from "react";

/* ---------- inline lucide-style icons (mirrors the app's lucide set) ---------- */

function I({ children, size = 16, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ic = {
  userCircle: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66" />
    </I>
  ),
  users: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </I>
  ),
  rupee: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a6 6 0 0 0 0-10H6" />
    </I>
  ),
  settings: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </I>
  ),
  creditCard: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </I>
  ),
  star: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.12 2.12 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.12 2.12 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16z" />
    </I>
  ),
  phone: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </I>
  ),
  mail: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </I>
  ),
  globe: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
    </I>
  ),
  more: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </I>
  ),
  x: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M18 6 6 18M6 6l12 12" />
    </I>
  ),
  zap: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </I>
  ),
  layers: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </I>
  ),
  camera: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </I>
  ),
  qr: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="16" width="5" height="5" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
    </I>
  ),
  image: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </I>
  ),
  userPlus: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </I>
  ),
  search: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </I>
  ),
  sliders: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M21 4H14M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4" />
    </I>
  ),
  mapPin: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </I>
  ),
  chevDown: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m6 9 6 6 6-6" />
    </I>
  ),
  chevRight: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m9 18 6-6-6-6" />
    </I>
  ),
  arrowLeft: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m12 19-7-7 7-7M19 12H5" />
    </I>
  ),
  arrowRight: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </I>
  ),
  flame: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </I>
  ),
  thermo: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />
    </I>
  ),
  snow: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M12 2v20M4 6l16 12M20 6L4 18" />
    </I>
  ),
  brain: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M12 5v13" />
    </I>
  ),
  target: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </I>
  ),
  user: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </I>
  ),
  building: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </I>
  ),
  news: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z" />
    </I>
  ),
  trendUp: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </I>
  ),
  gauge: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m12 14 4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </I>
  ),
  sparkles: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96l6.13-1.59A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0l1.59 6.13a2 2 0 0 0 1.43 1.43l6.13 1.59a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.43 1.44l-1.59 6.13a.5.5 0 0 1-.96 0z" />
      <path d="M20 3v4M22 5h-4" />
    </I>
  ),
  compass: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </I>
  ),
  share: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </I>
  ),
  refresh: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </I>
  ),
  listChecks: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />
    </I>
  ),
  sheet: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8M8 9h1" />
    </I>
  ),
  chat: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </I>
  ),
  send: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </I>
  ),
  lock: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </I>
  ),
  check: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M20 6 9 17l-5-5" />
    </I>
  ),
  gift: (s = 16, c = "") => (
    <I size={s} className={c}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </I>
  ),
  coins: (s = 16, c = "") => (
    <I size={s} className={c}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </I>
  ),
  wave: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M5 12.86a10 10 0 0 1 14 0M8.5 16.43a5 5 0 0 1 7 0M2 9.3a15 15 0 0 1 20 0" />
      <circle cx="12" cy="20" r="0.5" fill="currentColor" />
    </I>
  ),
  box: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </I>
  ),
  play: (s = 16, c = "") => (
    <I size={s} className={c}>
      <path d="m6 3 14 9-14 9V3z" />
    </I>
  ),
};

/* ------------------------------- shared chrome ------------------------------- */

/** iPhone 16 status bar: 9:41, Dynamic Island pill, signal/wifi/battery tray. */
function StatusBar({ light = false }: { light?: boolean }) {
  return (
    <div className={`kps-status${light ? " kps-status--light" : ""}`}>
      <span className="kps-time">9:41</span>
      <span className="kps-island" />
      <span className="kps-tray">
        <span className="kps-sig" />
        <span className="kps-batt" />
      </span>
    </div>
  );
}

const TABS: { icon: (s?: number, c?: string) => ReactNode; label: string }[] = [
  { icon: ic.userCircle, label: "V-Card" },
  { icon: ic.users, label: "Leads" },
  { icon: ic.qr, label: "Scan" }, // center FAB slot
  { icon: ic.rupee, label: "Plan" },
  { icon: ic.settings, label: "Configs" },
];

/** Floating glass tab bar with the raised orange Scan FAB - as in the app. */
function TabBar({ active }: { active: number }) {
  return (
    <div className="kps-tabbar">
      {TABS.map((t, i) =>
        i === 2 ? (
          <span key="fab" className="kps-fabslot">
            <span className={`kps-fab${active === 2 ? " on" : ""}`}>
              <span className="kps-fab-glint" />
              <span className="kps-fab-k">K</span>
            </span>
            <em>Scan</em>
          </span>
        ) : (
          <span key={t.label} className={`kps-tab${active === i ? " on" : ""}`}>
            <span className="kps-tab-chip">{t.icon(20)}</span>
            <em>{t.label}</em>
          </span>
        ),
      )}
    </div>
  );
}

/** Real, scannable QR - Harshal's vCard, generated by scripts/gen-vcard-assets.mjs
    (error correction H, so the centered K badge doesn't break scanning). */
function Qr() {
  return (
    <span className="kps-qr" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/vcard-qr.svg" alt="" width={190} height={190} loading="lazy" />
      <b className="kps-qr-k">K</b>
    </span>
  );
}

/* ------------------------------- 1 · V-CARD HOME -------------------------------
   app/(tabs)/index.tsx + BusinessCardItem - light canvas, warm-ivory card,
   QR hero with accent corner brackets, PRIMARY CARD pill, identity + contact
   rows, "--- KAUNTECH ---" footer, AR / 1 of 3 / EDIT pagination row.        */

export function CardScreen() {
  return (
    <div className="kps kps--vcard">
      <StatusBar />
      <div className="kps-head">
        <span className="kps-head-title">Kauntech</span>
        <span className="kps-cap">
          {ic.creditCard(13)} <b>1</b>/3 <em>CARDS</em>
        </span>
      </div>

      <div className="kps-vcard">
        <span className="kps-vcard-sheen" />
        <div className="kps-qrhero">
          <span className="kps-bracket b1" />
          <span className="kps-bracket b2" />
          <span className="kps-bracket b3" />
          <span className="kps-bracket b4" />
          <Qr />
        </div>

        <div className="kps-primary-pill">{ic.star(10)} PRIMARY CARD</div>

        <div className="kps-vcard-divider" />

        <div className="kps-vcard-id">
          <span className="kps-vcard-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/founder.jpg" alt="" width={44} height={44} loading="lazy" />
          </span>
          <span className="kps-vcard-who">
            <b>Harshal Vadgama</b>
            <i>Founder · Kauntech</i>
          </span>
        </div>

        <div className="kps-vcard-rows">
          <span>{ic.phone(13)} 7021000764</span>
          <span>{ic.mail(13)} business@voltairtech.com</span>
          <span>{ic.globe(13)} kauntech.com</span>
        </div>

        <div className="kps-vcard-foot">
          <i />
          <span>KAUNTECH</span>
          <i />
        </div>
      </div>

      <div className="kps-pager-row">
        <span className="kps-ar-btn">AR</span>
        <span className="kps-pager">
          <b>1</b> / 3
        </span>
        <span className="kps-edit-btn">
          {ic.more(15)}
          <em>EDIT</em>
        </span>
      </div>

      <TabBar active={0} />
    </div>
  );
}

/* --------------------------------- 2 · SCAN ------------------------------------
   app/(tabs)/scan.tsx - full-screen camera (always dark), glass toggles top
   right, viewfinder with animated corner brackets + laser, HUD status pill
   cycling ALIGN CARD → HOLD STILL → READING CARD → ANALYZING → SAVED,
   mode pills + GALLERY / shutter / MANUAL action row.                        */

export function ScanScreen() {
  return (
    <div className="kps kps--scan">
      <StatusBar light />
      <div className="kps-scan-top">
        <span className="kps-scan-x">{ic.x(18)}</span>
        <span className="kps-scan-toggles">
          <span className="kps-glass-pill">{ic.layers(11)} 2 SIDES</span>
          <span className="kps-glass-pill on">AUTO</span>
          <span className="kps-glass-pill">{ic.zap(11)}</span>
        </span>
      </div>

      <div className="kps-hud">
        <span className="kps-hud-dot" />
        <span className="kps-hud-text" aria-hidden="true">
          <span>ALIGN CARD</span>
          <span>HOLD STILL</span>
          <span>READING CARD</span>
          <span>ANALYZING</span>
          <span className="ok">SAVED · OFFLINE</span>
        </span>
        <span className="kps-hud-div" />
        <span className="kps-hud-nfc">{ic.wave(11)} TAP FOR NFC</span>
      </div>

      <div className="kps-frame">
        <span className="kps-corner c1" />
        <span className="kps-corner c2" />
        <span className="kps-corner c3" />
        <span className="kps-corner c4" />

        <div className="kps-bizcard">
          <div className="kps-bizcard-brand">VOLTAIRTECH</div>
          <div className="kps-bizcard-line w60" />
          <div className="kps-bizcard-line w80" />
          <div className="kps-bizcard-line w45" />
          <div className="kps-bizcard-foot">
            <span className="kps-bizcard-line w35" />
            <span className="kps-bizcard-dot" />
          </div>
        </div>

        <span className="kps-beam" />

        <span className="kps-chip kps-chip--1">{ic.check(11)} Harshal Vadgama</span>
        <span className="kps-chip kps-chip--2">{ic.check(11)} 7021000764</span>
        <span className="kps-chip kps-chip--3">{ic.check(11)} business@voltairtech.com</span>

        <span className="kps-confidence" />
      </div>

      <div className="kps-scan-modes">
        <span className="on">{ic.camera(13)} Scan Business Card</span>
        <span>{ic.qr(13)} Scan QR/NFC</span>
      </div>

      <div className="kps-shutter-row">
        <span className="kps-shutter-side">
          {ic.image(18)}
          <em>GALLERY</em>
        </span>
        <span className="kps-shutter">
          <span className="kps-shutter-ring" />
        </span>
        <span className="kps-shutter-side">
          {ic.userPlus(18)}
          <em>MANUAL</em>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ 3 · AI INTEL -----------------------------------
   app/contact/[id].tsx + AIIntelPanel - centered "Contact Details" header,
   General/Intel/Strategy segmented pills, the just-scanned contact row, the
   "Deep AI Intel Scan" card, cycling analysis status, and the extracted
   COMPANY DOSSIER filling in fact by fact (company, size, news, decision
   power) + personalization hooks - the payoff of the scan one chapter ago.  */

const INTEL_FACTS = [
  { icon: ic.building, text: "IT services & product studio · Mumbai, IN" },
  { icon: ic.users, text: "11-50 people · founded 2019 · bootstrapped" },
  { icon: ic.news, text: "In the news: expanding to Pune this quarter" },
  { icon: ic.gauge, text: "Decision power: Founder - signs off on tools" },
];

export function IntelScreen() {
  return (
    <div className="kps kps--intel">
      <StatusBar />
      <div className="kps-head kps-head--center">
        <span className="kps-head-back">{ic.arrowLeft(18)}</span>
        <span className="kps-head-title">Contact Details</span>
        <span className="kps-head-spacer" />
      </div>

      <div className="kps-segs">
        <span>{ic.user(13)} General</span>
        <span className="on">{ic.brain(13)} Intel</span>
        <span>{ic.target(13)} Strategy</span>
      </div>

      <div className="kps-intel-who">
        <span className="kps-lead-avatar">H</span>
        <span className="kps-intel-who-id">
          <b>Harshal Vadgama</b>
          <i>Founder · Voltairtech</i>
        </span>
        <span className="kps-intel-who-tag">{ic.camera(10)} JUST SCANNED</span>
      </div>

      <div className="kps-intel-card">
        <span className="kps-intel-brain">{ic.brain(22)}</span>
        <b>Deep AI Intel Scan</b>
        <p>Full company dossier + this person&apos;s role, influence, and the angle that opens the door.</p>
      </div>

      <div className="kps-intel-status" aria-hidden="true">
        <span>Reading their website…</span>
        <span>Mapping what the company does…</span>
        <span>Checking recent news &amp; moves…</span>
        <span className="ok">Dossier ready ✓ · 50 tokens</span>
      </div>

      <div className="kps-sec kps-sec--dossier">
        <label>COMPANY DOSSIER · VOLTAIRTECH</label>
        {INTEL_FACTS.map((f, idx) => (
          <span className={`kps-fact kps-fact--${idx + 1}`} key={f.text}>
            {f.icon(12)} {f.text}
          </span>
        ))}
      </div>
      <div className="kps-sec kps-sec--2">
        <label>PERSONALIZATION HOOKS</label>
        <span className="kps-hook">“Congrats on the Pune expansion -”</span>
        <span className="kps-hook kps-hook--2">“Saw you&apos;re scaling the Mumbai team -”</span>
      </div>

      <div className="kps-actionbar">
        <span className="kps-action">
          {ic.share(17)}
          <em>Share</em>
        </span>
        <span className="kps-action-fab">{ic.brain(22)}</span>
        <span className="kps-action gold">
          {ic.refresh(17)}
          <em>Regenerate</em>
        </span>
      </div>
    </div>
  );
}

/* ----------------------------- 3b · AI STRATEGY --------------------------------
   app/contact/[id].tsx - Strategy segment (Ultra's "AI Sales Strategy"): the
   Deal Verdict card with its confidence meter, the three-step playbook
   (opener → objection → next move) and the same floating action bar.        */

const PLAYS = [
  { n: "01", tag: "THE OPENER", icon: ic.sparkles, text: "“Congrats on the Pune expansion - that rollout is exactly where we help.”" },
  { n: "02", tag: "THE OBJECTION", icon: ic.chat, text: "They already run Zoho - lead with offline scanning and DPDP compliance." },
  { n: "03", tag: "NEXT MOVE", icon: ic.send, text: "Send the Pro deck today. Follow up Thursday morning, 11:00." },
];

export function StrategyScreen() {
  return (
    <div className="kps kps--strategy">
      <StatusBar />
      <div className="kps-head kps-head--center">
        <span className="kps-head-back">{ic.arrowLeft(18)}</span>
        <span className="kps-head-title">Contact Details</span>
        <span className="kps-head-spacer" />
      </div>

      <div className="kps-segs">
        <span>{ic.user(13)} General</span>
        <span>{ic.brain(13)} Intel</span>
        <span className="on">{ic.target(13)} Strategy</span>
      </div>

      <div className="kps-intel-status" aria-hidden="true">
        <span>Reading the Intel dossier…</span>
        <span>Weighing role, budget &amp; timing…</span>
        <span>Drafting openers &amp; counters…</span>
        <span className="ok">Playbook ready ✓ · 100 tokens</span>
      </div>

      <div className="kps-verdict">
        <label>{ic.target(11)} DEAL VERDICT</label>
        <div className="kps-verdict-row">
          <b>PURSUE NOW</b>
          <span className="kps-verdict-score">
            87<i>% fit</i>
          </span>
        </div>
        <span className="kps-verdict-bar">
          <i />
        </span>
        <small>Decision-maker · budget window open · warm intro available</small>
      </div>

      {PLAYS.map((p, idx) => (
        <div className={`kps-play kps-play--${idx + 1}`} key={p.n}>
          <span className="kps-play-ic">{p.icon(15)}</span>
          <span className="kps-play-body">
            <label>
              <em>{p.n}</em> {p.tag}
            </label>
            <p>{p.text}</p>
          </span>
        </div>
      ))}

      <div className="kps-actionbar">
        <span className="kps-action">
          {ic.share(17)}
          <em>Share</em>
        </span>
        <span className="kps-action-fab">{ic.target(22)}</span>
        <span className="kps-action gold">
          {ic.refresh(17)}
          <em>Regenerate</em>
        </span>
      </div>
    </div>
  );
}

/* --------------------------------- 4 · LEADS -----------------------------------
   app/(tabs)/leads.tsx - People/Events switcher, search + temperature filter,
   "All Leads" event selector, lead rows with initial avatars, Brain/channel
   micro-badges, temperature chips and relative timestamps.                   */

const LEADS = [
  { init: "A", name: "Ananya Sharma", sub: "CTO · Zerodha", temp: "hot", tempLabel: "Hot", when: "Today", badges: ["brain", "wa"] },
  { init: "R", name: "Rohan Kulkarni", sub: "VP Sales · Tata Elxsi", temp: "warm", tempLabel: "Warm", when: "Today", badges: ["brain", "sheet"] },
  { init: "P", name: "Priya Menon", sub: "Design Lead · Infosys", temp: "cold", tempLabel: "Cold", when: "2d ago", badges: [] },
  { init: "D", name: "Dev Joshi", sub: "Founder · Razorpay", temp: "warm", tempLabel: "Warm", when: "3d ago", badges: ["mail"] },
];

const BADGE_ICON: Record<string, ReactNode> = {
  brain: ic.brain(11),
  wa: ic.chat(11),
  sheet: ic.sheet(11),
  mail: ic.mail(11),
};

const TEMP_ICON: Record<string, (s?: number, c?: string) => ReactNode> = {
  hot: ic.flame,
  warm: ic.thermo,
  cold: ic.snow,
};

export function LeadsScreen() {
  return (
    <div className="kps kps--leads">
      <StatusBar />
      <div className="kps-head">
        <span className="kps-head-title">Leads</span>
      </div>

      <div className="kps-switcher">
        <span className="on">People</span>
        <span>Events</span>
      </div>

      <div className="kps-search-row">
        <span className="kps-search">
          {ic.search(14)}
          <i>Search people, companies, events…</i>
        </span>
        <span className="kps-tempfilter">{ic.sliders(15)}</span>
      </div>

      <div className="kps-eventsel">
        <span className="kps-eventsel-pin">{ic.mapPin(12)}</span>
        <b>All Leads</b>
        {ic.chevDown(13, "kps-eventsel-chev")}
      </div>

      <div className="kps-lead kps-lead--new">
        <span className="kps-lead-avatar">H</span>
        <span className="kps-lead-id">
          <span className="kps-lead-name">
            <b>Harshal Vadgama</b>
            <span className="kps-mb kps-mb--brain kps-mb--pulse">{ic.brain(11)}</span>
          </span>
          <i>Founder · Voltairtech</i>
        </span>
        <span className="kps-lead-meta">
          <span className="kps-tempchip hot">{ic.flame(9)} Hot</span>
          <i>Just now</i>
        </span>
        {ic.chevRight(14, "kps-lead-chev")}
      </div>

      {LEADS.map((l) => (
        <div className="kps-lead" key={l.name}>
          <span className="kps-lead-avatar">{l.init}</span>
          <span className="kps-lead-id">
            <span className="kps-lead-name">
              <b>{l.name}</b>
              {l.badges.map((b) => (
                <span key={b} className={`kps-mb kps-mb--${b}`}>
                  {BADGE_ICON[b]}
                </span>
              ))}
            </span>
            <i>{l.sub}</i>
          </span>
          <span className="kps-lead-meta">
            <span className={`kps-tempchip ${l.temp}`}>
              {TEMP_ICON[l.temp](9)} {l.tempLabel}
            </span>
            <i>{l.when}</i>
          </span>
          {ic.chevRight(14, "kps-lead-chev")}
        </div>
      ))}

      <TabBar active={1} />
    </div>
  );
}

/* -------------------------------- 5 · CONFIGS ----------------------------------
   app/(tabs)/configs.tsx - "Syncs & APIs" / "App settings" switcher and the
   2-column integration tile grid (Quick Picks, Google Sheets, Mail
   Automation, WhatsApp, Webhook, Telegram) with status dots + switches.      */

const TILES = [
  { icon: ic.listChecks, tint: "#10B981", name: "Quick Picks", sub: "Products and who's assigned", status: "Active", on: true, d: 0 },
  { icon: ic.sheet, tint: "#22C55E", name: "Google Sheets", sub: "Sync contacts to a sheet", status: "Active", on: true, d: 1 },
  { icon: ic.mail, tint: "#3B82F6", name: "Mail Automation", sub: "Send follow-up emails", status: "Active", on: true, d: 2 },
  { icon: ic.chat, tint: "#25D366", name: "WhatsApp", sub: "Auto-message new leads", status: "Active", on: true, d: 3 },
  { icon: ic.zap, tint: "#8B5CF6", name: "Webhook", sub: "POST to any URL", status: "Active", on: true, d: 4 },
  { icon: ic.send, tint: "#2AABEE", name: "Telegram", sub: "Save leads to your chat", status: "Set up", on: false, d: 5 },
];

export function ConfigsScreen() {
  return (
    <div className="kps kps--configs">
      <StatusBar />
      <div className="kps-head">
        <span className="kps-head-title">Configs</span>
      </div>

      <div className="kps-switcher kps-switcher--configs">
        <span className="on">Syncs &amp; APIs</span>
        <span>App settings</span>
      </div>

      <div className="kps-toast">
        {ic.zap(13)} New lead routed · <b>Harshal V.</b>
      </div>

      <div className="kps-tiles">
        {TILES.map((t) => (
          <div
            className={`kps-tile${t.on ? " kps-tile--on" : ""} kps-tile--${t.d + 1}`}
            key={t.name}
            style={{ ["--tint" as string]: t.tint }}
          >
            <div className="kps-tile-top">
              <span className="kps-tile-ic">{t.icon(18)}</span>
              <span className={`kps-mini-switch${t.on ? " on" : ""}`}>
                <i />
              </span>
            </div>
            <b>{t.name}</b>
            <i>{t.sub}</i>
            <span className="kps-tile-status">
              <em className={t.on ? "dot on" : "dot"} />
              {t.status}
            </span>
          </div>
        ))}
      </div>

      <TabBar active={4} />
    </div>
  );
}

/* ---------------------------------- 6 · PLAN -----------------------------------
   app/(tabs)/plan.tsx - YOUR PLAN header, Overview/K-Tokens/Upgrade tabs,
   token balance with usage bar, real token costs (AI Fix 1 · AI Intel 50 ·
   AI Strategy 100) and the RECOMMENDED Pro card at ₹399/mo billed annually. */

const TOKEN_COSTS = [
  { icon: ic.sparkles, name: "AI Fix", cost: "1", tint: "#D97706" },
  { icon: ic.brain, name: "AI Intel", cost: "50", tint: "#6366F1" },
  { icon: ic.target, name: "AI Strategy", cost: "100", tint: "#10B981" },
];

export function PlanScreen() {
  return (
    <div className="kps kps--plan">
      <StatusBar />
      <div className="kps-plan-head">
        <label>YOUR PLAN</label>
        <div className="kps-plan-title">
          <span className="kps-plan-dot" />
          <b>
            KaunTech <em>Pro</em>
          </b>
          <span className="kps-gift">{ic.gift(15)}</span>
        </div>
      </div>

      <div className="kps-switcher kps-switcher--plan">
        <span>Overview</span>
        <span className="on">K-Tokens</span>
        <span>Upgrade</span>
      </div>

      <div className="kps-tokens">
        <label>K-TOKENS</label>
        <div className="kps-tokens-num">
          712<i>/1,000</i>
        </div>
        <span className="kps-tokens-bar">
          <i />
        </span>
        <small>
          <span>71% used</span>
          <span>288 left · resets monthly</span>
        </small>
      </div>

      <div className="kps-costs">
        {TOKEN_COSTS.map((t) => (
          <span className="kps-cost" key={t.name} style={{ ["--tint" as string]: t.tint }}>
            {t.icon(14)}
            <b>{t.name}</b>
            <em>
              {t.cost}
              <i> KT</i>
            </em>
          </span>
        ))}
      </div>

      <div className="kps-plancard">
        <span className="kps-plancard-badge">{ic.sparkles(9)} RECOMMENDED</span>
        <div className="kps-plancard-row">
          <b>Pro</b>
          <span>
            ₹399<i>/mo billed annually</i>
          </span>
        </div>
        <ul>
          <li>{ic.check(11)} 1,000 tokens · 500 scans per month</li>
          <li>{ic.check(11)} AI Intel (50 tokens / scan)</li>
          <li>{ic.check(11)} Google Sheets · Gmail · Telegram automation</li>
          <li>{ic.check(11)} AR template cards · 3 VCards</li>
        </ul>
        <span className="kps-plancard-cta">
          Upgrade to Pro {ic.arrowRight(13)}
        </span>
      </div>

      <div className="kps-packs">
        {ic.coins(12)} Top-ups: <b>200 · ₹99</b> <b>600 · ₹249</b> <b>1.5K · ₹549</b>
      </div>

      <TabBar active={3} />
    </div>
  );
}

/* --------------------------------- 7 · AR CARD ----------------------------------
   The WebAR card viewer (designed in the kauntech.com/ar studio, opened by
   the app's scanner): dark camera space, tracked paper card (with AR corner
   brackets) + floor reticle, a holographic 3D city model that constructs
   itself on the card and spins on a turntable, holo particles up the beam,
   the V-Card hologram swaying in 3D above it, layer chips, share-link pill. */

export function ArScreen() {
  return (
    <div className="kps kps--ar">
      <StatusBar light />
      <div className="kps-scan-top">
        <span className="kps-scan-x">{ic.x(18)}</span>
        <span className="kps-scan-toggles">
          <span className="kps-glass-pill on kps-ar-live">
            <i /> AR · TRACKING
          </span>
        </span>
      </div>

      <div className="kps-ar-stage">
        <span className="kps-ar-beam" />
        <span className="kps-ar-ring" />
        <span className="kps-ar-paper">
          <span className="kps-bizcard-line w60" />
          <span className="kps-bizcard-line w45" />
        </span>

        <span className="kps-ar-particles" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>

        <span className="kps-ar-model" aria-hidden="true">
          <span className="kps-ar-turntable">
            <span className="kps-ar-plate" />
            <span className="kps-ar-bldg kps-ar-bldg--a">
              <b className="kps-ar-wall kps-ar-wall--f">K</b>
              <b className="kps-ar-wall kps-ar-wall--k" />
              <b className="kps-ar-wall kps-ar-wall--l" />
              <b className="kps-ar-wall kps-ar-wall--r" />
              <b className="kps-ar-wall kps-ar-wall--t" />
              <i className="kps-ar-beacon" />
            </span>
            <span className="kps-ar-bldg kps-ar-bldg--b">
              <b className="kps-ar-wall kps-ar-wall--f" />
              <b className="kps-ar-wall kps-ar-wall--k" />
              <b className="kps-ar-wall kps-ar-wall--l" />
              <b className="kps-ar-wall kps-ar-wall--r" />
              <b className="kps-ar-wall kps-ar-wall--t" />
            </span>
          </span>
        </span>

        <div className="kps-ar-holo">
          <span className="kps-ar-holo-scan" aria-hidden="true" />
          <div className="kps-ar-holo-brand">KAUNTECH</div>
          <span className="kps-ar-holo-avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/founder.jpg" alt="" width={54} height={54} loading="lazy" />
          </span>
          <b>Harshal Vadgama</b>
          <i>Founder · Kauntech</i>
        </div>

        <span className="kps-ar-chip kps-ar-chip--1">{ic.box(11)} 3D MODEL</span>
        <span className="kps-ar-chip kps-ar-chip--2">{ic.play(11)} INTRO VIDEO</span>
        <span className="kps-ar-chip kps-ar-chip--3">{ic.userPlus(11)} TAP TO SAVE</span>
      </div>

      <div className="kps-ar-share">{ic.share(13)} kauntech.com/ar/harshal</div>
      <p className="kps-ar-hint">Scanned with the Kauntech camera - the card lifts off the paper.</p>
    </div>
  );
}

/* ------------------------------------ index ------------------------------------ */

export type ChapterScreen = {
  id: string;
  Screen: () => ReactNode;
  accent: string;
};

/** Order matches the scroll story: hero shows the V-Card, then the 5 chapters
    (Scan → Sync → Intel → Strategy → AR). Leads/Plan screens stay exported
    for reuse elsewhere. */
export const PHONE_SCREENS: ChapterScreen[] = [
  { id: "vcard", Screen: CardScreen, accent: "#D97706" },
  { id: "scan", Screen: ScanScreen, accent: "#EA580C" },
  { id: "sync", Screen: ConfigsScreen, accent: "#22C55E" },
  { id: "intel", Screen: IntelScreen, accent: "#6366F1" },
  { id: "strategy", Screen: StrategyScreen, accent: "#10B981" },
  { id: "ar", Screen: ArScreen, accent: "#8B5CF6" },
];
