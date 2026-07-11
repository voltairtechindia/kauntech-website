import { Cpu, IdCard, Send } from "lucide-react";
import Ic from "@/components/ui/Icon";

export default function Workflow() {
  return (
    <section
      id="workflow"
      style={{ background: "linear-gradient(180deg, var(--bg) 0%, var(--bg-card) 100%)" }}
    >
      <div className="container">
        <div className="section-header reveal">
          <span className="section-label">Seamless Process</span>
          <h1>3 Steps to Contact Mastery in 30 Seconds</h1>
          <p>From physical card to CRM sync while you are still shaking hands with your prospect.</p>
        </div>

        <div className="steps-grid reveal reveal-delay-1">
          <div className="step-card">
            <div className="step-num">1</div>
            <Ic icon={IdCard} className="step-icon" />
            <h3>CAPTURE</h3>
            <p>
              Scan physical card via OCR, scan QR code, tap NFC, or type manually. Works 100%
              offline with zero lag.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">2</div>
            <i className="ic step-icon" style={{ color: "var(--indigo)" }} aria-hidden="true">
              <Cpu />
            </i>
            <h3>ENRICH</h3>
            <p>
              Kauntech AI instantly adds company intelligence, lead scoring, and personalized
              icebreakers on-device.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">3</div>
            <i className="ic step-icon" style={{ color: "#34d399" }} aria-hidden="true">
              <Send />
            </i>
            <h3>AUTOMATE</h3>
            <p>
              Instantly route enriched data to WhatsApp, Email drafts, Google Sheets, or Webhooks
              automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
