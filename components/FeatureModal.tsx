"use client";

import { useEffect } from "react";

const items = [
  { icon: "fa-solid fa-bolt", label: "On-Device Neural OCR" },
  { icon: "fa-solid fa-qrcode", label: "Instant QR Capture" },
  { icon: "fa-solid fa-wave-square", label: "NFC Tap Exchange" },
  { icon: "fa-solid fa-microphone", label: "Offline Audio Memos" },
  { icon: "fa-solid fa-brain", label: "AI Lead Scoring" },
  { icon: "fa-solid fa-envelope-open-text", label: "AI Email Openers" },
  { icon: "fa-brands fa-whatsapp", label: "WhatsApp Automation" },
  { icon: "fa-solid fa-table", label: "Google Sheets Sync" },
  { icon: "fa-brands fa-telegram", label: "Telegram Bot Routing" },
  { icon: "fa-solid fa-lock", label: "DPDP 2023 Audit Ledger" },
];

export default function FeatureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className={`modal-overlay${open ? " active" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-container">
        <button className="modal-close" onClick={onClose} type="button">
          <i className="fa-solid fa-xmark" />
        </button>
        <div className="modal-icon">
          <i className="fa-solid fa-microchip" />
        </div>
        <h3 className="modal-title">Kauntech Omnichannel Capabilities</h3>
        <p className="modal-desc">
          Explore the powerful capabilities of our offline scanning ecosystem designed for
          high-speed contact management, AI enrichment, and seamless CRM integrations.
        </p>

        <div className="modal-features-grid">
          {items.map((it) => (
            <div className="modal-feature-item" key={it.label}>
              <i className={it.icon} />
              <span>{it.label}</span>
            </div>
          ))}
        </div>

        <button
          className="price-btn primary"
          type="button"
          onClick={() => {
            onClose();
            window.location.hash = "#pricing";
          }}
        >
          <span>Explore Pricing Plans</span>
        </button>
      </div>
    </div>
  );
}
