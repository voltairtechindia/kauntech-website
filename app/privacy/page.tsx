import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Kauntech privacy policy — DPDP Act 2023 compliance, Google API Limited Use disclosures, and how we handle, store, and protect your data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Privacy Policy | Kauntech",
    description:
      "Kauntech privacy policy — DPDP Act 2023 compliance, Google API Limited Use disclosures, and how we handle, store, and protect your data.",
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
                <i className="fa-solid fa-cloud" /> Our On-Device-First Principle
              </h4>
              <p style={{ marginBottom: 0 }}>
                Kauntech is built on-device-first: your camera images are read and parsed{" "}
                <strong>locally on your phone</strong> using on-device OCR, and your contacts are
                kept in an encrypted database on your device. Cloud backup is{" "}
                <strong>optional</strong> — on free plans everything stays on your device, and on
                paid plans you can switch on cloud backup to sync across devices. You choose exactly
                which categories of data (contacts, notes and tags, AI intelligence, images, and so
                on) are backed up to your Kauntech account on our secure cloud servers, and{" "}
                <strong>anything you don&apos;t select never leaves your device</strong>. You can
                turn cloud backup off, wipe your cloud data, or delete your account at any time. We
                never sell your data and never use it for advertising.
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

            <h3>A. Account &amp; Operational Metadata</h3>
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
                prevent tampering, quota hacks, or credential theft. This includes a{" "}
                <strong>one-way hashed, per-install device identifier</strong> (a random value
                generated on first launch — not your hardware ID, advertising ID, or any cross-app
                fingerprint) and a <strong>hashed IP address</strong>, used solely to enforce
                one-free-trial-per-install and to detect fraud. We do not use this data to track you
                across other apps or for advertising.
              </li>
              <li>
                <strong>Referral program data:</strong> If you join via or share an invite, we store
                your referral code, the link between a referrer and the friends they invite, and
                anonymous invite-link click logs (platform, user-agent, and a hashed IP address). We
                use this only to operate the rewards program and to prevent referral abuse. To save
                you typing, the sign-up screen may read your clipboard once to auto-fill a referral
                code you copied from an invite link — iOS shows its standard paste notification, the
                contents are used solely to detect that code, and nothing is read or stored if no
                valid code is present. The program is optional and can be ignored at sign-up.
              </li>
            </ul>

            <h3>B. Leads &amp; OCR Contact Details (Captured On-Device, Synced to Your Account)</h3>
            <ul>
              <li>
                <strong>Business Card Scans:</strong> Images captured by your camera are read and
                parsed locally on your device using an on-device OCR engine. If you enable cloud
                backup, the card image is also stored in your Kauntech account so you can
                access it across devices; otherwise it stays on your device. You can delete it or
                wipe your cloud data at any time.
              </li>
              <li>
                <strong>Parsed Contacts:</strong> Extracted fields (Name, Phone number, Email ID,
                Company, Role, and physical addresses) are kept on your device. If you enable cloud
                backup, the categories you choose (contact details, notes and tags, AI intelligence,
                and so on) are synced to your Kauntech account on our servers; categories you turn
                off are never uploaded.
              </li>
              <li>
                <strong>Audio Notes:</strong> Voice memos recorded right after pitching a prospect
                are saved locally on the device as audio clips.
              </li>
            </ul>

            <h3>C. AI Enrichment, Integrations &amp; Sub-Processors</h3>
            <ul>
              <li>
                <strong>AI processing:</strong> When you request AI features (OCR clean-up, company
                intelligence, icebreakers, lead scoring or strategy), the relevant card text and
                contact fields are sent to <strong>Google&apos;s Gemini API</strong> (the
                Generative Language API), accessed with our own API key, to generate the result,
                which is then saved against the contact in your account. Under Google&apos;s API
                terms this data is used only to produce your result and is not used to train
                Google&apos;s general models. Data obtained through Google integrations (such as
                Google Sheets or Gmail) is never sent to any AI service.
              </li>
              <li>
                <strong>Integrations you enable:</strong> when you connect Google Sheets, Gmail,
                Telegram or a webhook, the contact fields you choose are sent to that destination to
                perform the sync or message you requested. For Telegram, the bot token you provide is
                stored on our servers so we can deliver your leads to your own chat.
              </li>
              <li>
                <strong>Other processors:</strong> subscription and purchase events are handled by a
                third-party payments processor; crash and error diagnostics (with personal fields
                scrubbed) by a third-party diagnostics provider. Some of this processing may occur on
                servers located outside India.
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
              Google OAuth protocol. The App requests only two API scopes — a file-scoped Google
              Drive scope (which powers the Google Sheets sync) and a Gmail send scope — plus the
              basic <code>email</code> and <code>profile</code> scopes used to identify your account
              at sign-in. Below is the precise disclosure of each scope, its specific purpose, and
              our strict Limited Use policies:
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
                    <td><strong>Google Sheets sync (Drive, File-Scoped)</strong></td>
                    <td><code>.../auth/drive.file</code></td>
                    <td>
                      Powers the Google Sheets sync. Lets the App create a spreadsheet and write,
                      append, and organize parsed contacts and leads into that sheet — limited to
                      files the App itself created or that you explicitly opened with it.
                    </td>
                    <td>
                      <strong>Constrained, On-Device Direct Transfer:</strong> Access is restricted
                      strictly to files created by the Kauntech App — it cannot view or access any
                      other files in your Google Drive. Data is pushed directly from the App to the
                      Google API; no Sheet data passes through or is saved on Kauntech servers.
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
                  generalized artificial intelligence (AI) or large language models (LLMs), and we
                  never transmit it to any third-party AI provider. Data obtained through Google
                  integrations is used only to perform the sync or send action you request.
                </li>
                <li>
                  Google API tokens (Access and Refresh) are stored 100% locally and securely in
                  your device&apos;s native secure keychain and are
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
                Site, and our cloud backend are encrypted in transit using industry-standard
                TLS protocols.
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
              Email: business@voltairtech.com
              <br />
              Address: Mumbai, Maharashtra, India
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
