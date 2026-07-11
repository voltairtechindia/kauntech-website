"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  Cpu,
  Lock,
  MailOpen,
  Mic,
  QrCode,
  Table,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import Ic from "@/components/ui/Icon";
import Brand, { type BrandName } from "@/components/ui/BrandIcons";

type Item = { label: string; icon?: LucideIcon; brand?: BrandName };

const items: Item[] = [
  { icon: Zap, label: "On-Device Neural OCR" },
  { icon: QrCode, label: "Instant QR Capture" },
  { icon: Activity, label: "NFC Tap Exchange" },
  { icon: Mic, label: "Offline Audio Memos" },
  { icon: Brain, label: "AI Lead Scoring" },
  { icon: MailOpen, label: "AI Email Openers" },
  { brand: "whatsapp", label: "WhatsApp Automation" },
  { icon: Table, label: "Google Sheets Sync" },
  { brand: "telegram", label: "Telegram Bot Routing" },
  { icon: Lock, label: "DPDP 2023 Audit Ledger" },
];

export default function FeatureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
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
          <Ic icon={X} />
        </button>
        <div className="modal-icon">
          <Ic icon={Cpu} />
        </div>
        <h3 className="modal-title">Kauntech Omnichannel Capabilities</h3>
        <p className="modal-desc">
          Explore the powerful capabilities of our offline scanning ecosystem designed for
          high-speed contact management, AI enrichment, and seamless CRM integrations.
        </p>

        <div className="modal-features-grid">
          {items.map((it) => (
            <div className="modal-feature-item" key={it.label}>
              {it.brand ? <Brand name={it.brand} /> : it.icon ? <Ic icon={it.icon} /> : null}
              <span>{it.label}</span>
            </div>
          ))}
        </div>

        <button
          className="price-btn primary"
          type="button"
          onClick={() => {
            onClose();
            router.push("/pricing");
          }}
        >
          <span>Explore Pricing Plans</span>
        </button>
      </div>
    </div>
  );
}
