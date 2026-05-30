import type { Metadata } from "next";
import DeletionForm from "@/components/DeletionForm";

export const metadata: Metadata = {
  title: "Data Deletion Request Portal",
  description:
    "Submit a DPDP Act 2023 / Google OAuth data deletion request. Disconnect integrations, purge local scans, or request a full database erasure.",
  alternates: { canonical: "/delete-request" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Data Deletion Request Portal | Kauntech",
    description:
      "Submit a DPDP Act 2023 / Google OAuth data deletion request. Disconnect integrations, purge local scans, or request a full database erasure.",
    url: "/delete-request",
  },
};

export default function DeleteRequestPage() {
  return (
    <section className="legal-content">
      <div className="container">
        <div className="legal-card">
          <h1 className="grad-text">Data Deletion Portal</h1>
          <p className="subtitle">
            Pursuant to India&apos;s DPDP Act 2023 (Right to Erasure) and Google OAuth console user
            security requirements, you can instantly revoke authorization or purge your account
            details using the options below.
          </p>

          <div className="portal-grid">
            <div className="instruction-box">
              <h3>
                <i className="fa-solid fa-mobile-screen-button" /> Self-Service App Options
              </h3>
              <p
                style={{
                  color: "var(--text-dim)",
                  fontSize: "0.95rem",
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}
              >
                Before requesting manual database purge, you have complete control over all offline
                contacts and connected Google OAuth integrations directly inside the mobile
                application. Clear your local storage or disconnect profiles instantly:
              </p>

              <ul className="step-list">
                <li className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-text">
                    <h4>Disconnect Google OAuth Permissions</h4>
                    <p>
                      In the Kauntech App, navigate to <strong>Settings</strong> &gt;{" "}
                      <strong>Integrations</strong> &gt; Tap <strong>Disconnect</strong> next to
                      Google Sheets or Gmail. This instantly and completely purges all local OAuth
                      access/refresh tokens from your device&apos;s native encrypted keychain.
                    </p>
                  </div>
                </li>
                <li className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-text">
                    <h4>Erase Local Contact Scans</h4>
                    <p>
                      To purge physical card databases cached locally, go to{" "}
                      <strong>Settings</strong> &gt; Tap <strong>Delete Local Database</strong> or
                      clear the App cache from your mobile operating system&apos;s general settings
                      menu.
                    </p>
                  </div>
                </li>
                <li className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-text">
                    <h4>Revoke Google Access Remotely</h4>
                    <p>
                      You can revoke Kauntech&apos;s token access directly from your own Google
                      security console. Visit{" "}
                      <a
                        href="https://myaccount.google.com/connections"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--gold)", textDecoration: "underline" }}
                      >
                        Google Third-Party Connections
                      </a>
                      , select <strong>Kauntech</strong>, and tap <strong>Remove Access</strong>.
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <DeletionForm />
          </div>
        </div>
      </div>
    </section>
  );
}
