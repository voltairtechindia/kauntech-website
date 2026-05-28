import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Kauntech privacy policy — DPDP Act 2023 compliance, Google API Limited Use disclosures, and how we handle your data on-device.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Kauntech",
    description:
      "Kauntech privacy policy — DPDP Act 2023 compliance, Google API Limited Use disclosures, and how we handle your data on-device.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <section className="legal-content">
      <div className="container">
        <div className="legal-card">
          <h1 className="grad-text">Privacy Policy</h1>
          <span className="last-updated">
            <i className="fa-solid fa-calendar-days" /> Last Updated: May 28, 2026
          </span>

          <div className="legal-body">
            <p>
              At <strong>Kauntech</strong>, owned and operated by Kauntech Technologies Pvt. Ltd. (&quot;we&quot;, &quot;us&quot;,
              or &quot;our&quot;), your privacy is our core philosophy. We design our offline-first business
              card scanning ecosystem to guarantee that your contacts remain secure and entirely
              under your own control.
            </p>

            <p>
              This Privacy Policy explains how we collect, process, disclose, and secure your
              personal information, specifically in accordance with the{" "}
              <strong>Digital Personal Data Protection (DPDP) Act 2023</strong> of India, and
              details how our App handles data associated with{" "}
              <strong>Google OAuth integrations</strong>.
            </p>

            <div className="alert-box indigo-alert">
              <h4>
                <i className="fa-solid fa-cloud" /> Our Zero Server-Retention Principle
              </h4>
              <p style={{ marginBottom: 0 }}>
                We do <strong>NOT</strong> view, store, upload, copy, or retain scanned business
                card images, parsed OCR textual lists, or enriched contact details on Kauntech
                servers. All contact parsing, local storage, and neural OCR processes run directly
                on-device. Data synchronization only occurs when you intentionally trigger
                integrations (such as Google Sheets, WhatsApp, or email drafts) directly to your
                own accounts.
              </p>
            </div>

            <h2>
              <i className="fa-solid fa-clipboard-list" /> 1. Information We Process &amp; Record
            </h2>
            <p>
              Because Kauntech operates primarily offline, our processing of data is strictly
              limited. We only process information required to manage subscription tiers, maintain
              legitimate operational consent, and enable synchronization triggers:
            </p>

            <h3>A. Account &amp; Operational Metadata (Stored on Supabase)</h3>
            <ul>
              <li>
                <strong>Authentication details:</strong> Name, professional email address, and
                encrypted passwords or magic-link identifiers.
              </li>
              <li>
                <strong>SaaS subscription metadata:</strong> Active subscription tier, total monthly
                scans logged, and your <strong>K-Tokens</strong> balance.
              </li>
              <li>
                <strong>Device security logs:</strong> Device specifications and authorization
                markers. Under our secure architecture, we log minimal device telemetry strictly to
                prevent tampering, quota hacks, or credential theft.
              </li>
            </ul>

            <h3>B. Leads &amp; OCR Contact Details (Processed 100% On-Device)</h3>
            <ul>
              <li>
                <strong>Business Card Scans:</strong> Images captured by your camera are processed
                locally via on-device ML Kit OCR engines. The raw image and OCR text are never sent
                to our servers.
              </li>
              <li>
                <strong>Parsed Contacts:</strong> Extracted fields (Name, Phone number, Email ID,
                Company, Role, and physical addresses) are saved in encrypted local storage
                (<code>SecureStore</code>) on your smartphone.
              </li>
              <li>
                <strong>Audio Notes:</strong> Voice memos recorded right after pitching a prospect
                are saved locally on the device as audio clips.
              </li>
            </ul>

            <h2>
              <i className="fa-solid fa-arrows-spin" /> 2. Legitimate Purposes &amp; DPDP Notice
            </h2>
            <p>
              Under the DPDP Act 2023, data processing must strictly serve specified, lawful, and
              necessary purposes. Kauntech processes your account data solely for the following
              legitimate purposes:
            </p>
            <ul>
              <li>Providing secure user authentication, password resets, and session recovery.</li>
              <li>
                Enabling B2B contact extraction, smart AI enrichment (icebreakers, company
                details), and on-device formatting fixes.
              </li>
              <li>Accurately tracking scans quotas, billing transactions, and K-Token expenditures.</li>
              <li>Processing direct client requests for customer support or system assistance.</li>
            </ul>

            <div id="google-disclosure" />
            <h2>
              <i className="fa-brands fa-google" /> 3. Google OAuth &amp; API User Data Disclosures
            </h2>
            <p>
              The Kauntech App provides voluntary integrations with Google APIs (Google Sheets and
              Gmail) to automate follow-up workflows. Connecting these integrations triggers the
              Google OAuth protocol. Below is the precise disclosure of the Google API scopes
              requested, their specific purposes, and our strict Limited Use policies:
            </p>

            <div className="table-container">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Scope Name</th>
                    <th>API Identifier</th>
                    <th>Exact Purpose within Kauntech</th>
                    <th>Processing &amp; Retention</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Google Sheets</strong></td>
                    <td><code>.../auth/spreadsheets</code></td>
                    <td>
                      Allows the App to write, append, and organize parsed contacts and leads
                      directly into a Google Sheet spreadsheet selected or created by the user.
                    </td>
                    <td>
                      <strong>On-Device Direct Transfer:</strong> Data is pushed directly from the
                      App to Google Sheets API endpoints. No Google Sheet data passes through or is
                      saved on Kauntech servers.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Google Drive (File Scoped)</strong></td>
                    <td><code>.../auth/drive.file</code></td>
                    <td>
                      Allows the App to create new spreadsheets and only read/write files that have
                      been created or explicitly opened with the Kauntech App.
                    </td>
                    <td>
                      <strong>Constrained Access:</strong> Restricted strictly to files created by
                      the Kauntech App. The App cannot view or access any other files in your
                      Google Drive.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Gmail Send</strong></td>
                    <td><code>.../auth/gmail.send</code></td>
                    <td>
                      Enables professionals to send personalized follow-up emails and AI-enriched
                      cold templates directly via their own Gmail account upon scanning a card.
                    </td>
                    <td>
                      <strong>Direct Dispatch:</strong> Drafts are created and sent directly via
                      Google Gmail API. No email body, email metadata, or Google login token is
                      sent to or stored on Kauntech servers.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="alert-box">
              <h4>
                <i className="fa-solid fa-shield-halved" /> Google Limited Use Compliance
              </h4>
              <p>
                Kauntech&apos;s use and transfer of information received from Google APIs to any
                other app will strictly adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", textDecoration: "underline", fontWeight: 700 }}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <p>
                <strong>Specifically:</strong>
              </p>
              <ul style={{ marginBottom: 0 }}>
                <li>
                  We do <strong>NOT</strong> sell, trade, rent, or transfer Google OAuth user data
                  to third parties, advertising networks, or data brokers.
                </li>
                <li>
                  We do <strong>NOT</strong> use Google OAuth user data to display, target, or
                  serve advertisements.
                </li>
                <li>
                  We do <strong>NOT</strong> use Google OAuth user data to train, enrich, or build
                  generalized artificial intelligence (AI) or large language models (LLMs). All AI
                  refinement is client-driven or through user-specific cloud tokens.
                </li>
                <li>
                  Google API tokens (Access and Refresh) are stored 100% locally and securely in
                  your device&apos;s native keychain using <code>expo-secure-store</code> and are
                  fully cleared upon log-out.
                </li>
              </ul>
            </div>

            <h2>
              <i className="fa-solid fa-lock" /> 4. Data Security &amp; AES-256 Encryption
            </h2>
            <p>
              We implement top-tier technical and organizational security measures to shield your
              data from accidental loss, leakage, or unauthorized access:
            </p>
            <ul>
              <li>
                <strong>Encrypted Device Databases:</strong> All local database entries, parsed
                cards, and connected OAuth credentials are secured using AES-256 local keychain
                encryption.
              </li>
              <li>
                <strong>Transport Layer Security:</strong> All communications between the App,
                Site, and our Supabase backend are encrypted in transit using industry-standard
                TLS 1.3 protocols.
              </li>
              <li>
                <strong>Isolation Protocols:</strong> Third-party API keys and tokens are securely
                isolated in native keychain storage and cannot be read by other installed
                applications.
              </li>
            </ul>

            <h2>
              <i className="fa-solid fa-scale-balanced" /> 5. Your DPDP Act Rights (Consent, Access
              &amp; Deletion)
            </h2>
            <p>
              Under the DPDP Act 2023, Indian citizens have robust statutory rights regarding their
              digital personal data. We fully support these rights globally:
            </p>
            <ul>
              <li>
                <strong>Right to Withdraw Consent:</strong> You can disconnect your Google Sheets
                or Gmail integrations at any time from the App&apos;s &quot;Settings&quot; panel,
                instantly revoking all OAuth permissions.
              </li>
              <li>
                <strong>Right to Access &amp; Correction:</strong> You have the right to view all
                account metadata and correct any inaccuracies inside the App profile.
              </li>
              <li>
                <strong>Right to Erasure (Deletion):</strong> You can permanently delete your
                Kauntech account directly inside the App at any time:{" "}
                <em>Configs → App settings → Account → Delete Account</em>. Your account enters a
                30-day grace period (during which you can sign back in and tap{" "}
                <em>Cancel deletion</em>); after the grace window all profile data, scanned cards,
                contacts, products, templates, integration tokens, voice memos and uploaded images
                associated with your account are permanently purged from our database by an
                automated nightly job. You may also clear local-only data by clearing App storage,
                or submit a deletion request through our{" "}
                <a href="/delete-request" style={{ color: "var(--gold)", textDecoration: "underline" }}>
                  Data Deletion Request Portal
                </a>{" "}
                if you no longer have access to the App.
              </li>
            </ul>

            <h2>
              <i className="fa-solid fa-circle-exclamation" /> 6. Changes to This Privacy Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time to accommodate changes in Google
              Developer Policies, DPDP Act rules, or our offline application workflow. Any updates
              will be published on this page, and we will update the &quot;Last Updated&quot;
              timestamp. We recommend checking this page periodically to remain informed about how
              we safeguard your B2B contacts.
            </p>

            <h2>
              <i className="fa-solid fa-envelope-open-text" /> 7. Contact our Privacy Officer
            </h2>
            <p>
              If you have any questions, compliance queries, or complaints regarding our data
              handling practices or Google OAuth integrations, please contact our designated
              Grievance &amp; Privacy Officer:
            </p>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.9rem",
                color: "var(--gold)",
                borderLeft: "2px solid var(--gold)",
                paddingLeft: 16,
              }}
            >
              Kauntech Technologies Pvt. Ltd.
              <br />
              Attn: Data Protection Officer / Grievance Redressal
              <br />
              Email: voltairtechindia@gmail.com
              <br />
              Address: Mumbai, Maharashtra, India
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
