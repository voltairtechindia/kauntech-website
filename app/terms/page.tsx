import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Kauntech Terms of Service — eligibility, subscription terms, K-Tokens economy, App Store / Google Play billing, and account deletion.",
  alternates: { canonical: "/terms" },
  openGraph: {
    title: "Terms of Service | Kauntech",
    description:
      "Kauntech Terms of Service — eligibility, subscription terms, K-Tokens economy, App Store / Google Play billing, and account deletion.",
    url: "/terms",
  },
};

export default function TermsPage() {
  return (
    <section className="legal-content">
      <div className="container">
        <div className="legal-card">
          <h1 className="grad-text">Terms of Service</h1>
          <span className="last-updated">
            <i className="fa-solid fa-calendar-days" /> Last Updated: May 28, 2026
          </span>

          <div className="legal-body">
            <p>
              Welcome to <strong>Kauntech</strong>. These Terms of Service (&quot;Terms&quot;)
              govern your access to and use of the Kauntech mobile application (&quot;App&quot;),
              the website located at{" "}
              <a
                href="https://www.kauntech.com"
                style={{ color: "var(--gold)", textDecoration: "underline" }}
              >
                kauntech.com
              </a>{" "}
              (&quot;Site&quot;), and all related software services, AI processing utilities, and
              sync integrations offered by Kauntech Technologies Pvt. Ltd. (&quot;Kauntech&quot;,
              &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
            </p>
            <p>
              By downloading the App, creating an account, subscribing to a plan, or using any part
              of our services, you agree to be bound by these Terms. If you do not agree to these
              Terms, you must immediately cease all use of our Site and App.
            </p>

            <h2><i className="fa-solid fa-user-check" /> 1. Eligibility &amp; User Accounts</h2>
            <p>
              To use Kauntech, you must be a corporate entity, business association, or an
              individual acting in a professional capacity who is at least 18 years of age and
              capable of forming a binding contract under applicable laws (including the Indian
              Contract Act, 1872).
            </p>
            <p>When creating an account, you agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete registration information.</li>
              <li>
                Maintain the security and confidentiality of your credentials (including API keys,
                Supabase credentials, and device authentication states).
              </li>
              <li>Promptly notify us of any unauthorized account access or data security incidents.</li>
              <li>
                Accept sole responsibility for all activities that occur under your account,
                including any scanned contact details or external API actions triggered.
              </li>
            </ul>

            <h2><i className="fa-solid fa-tablet-screen-button" /> 2. License &amp; App Usage</h2>
            <p>
              Subject to your strict compliance with these Terms, Kauntech grants you a limited,
              non-exclusive, non-transferable, revocable, non-sublicensable license to download and
              install a copy of the App on an authorized mobile device solely for your professional
              B2B lead capture and contact management purposes.
            </p>
            <p>
              You strictly agree <strong>NOT</strong> to:
            </p>
            <ul>
              <li>
                Modify, disassemble, decompile, reverse-engineer, decrypt, or hack the App,
                Supabase Edge Functions, or the OCR engine.
              </li>
              <li>
                Use any automated scraping, bots, scripts, or manual database extraction tools to
                scrape, collect, or monitor Site content or other user profiles.
              </li>
              <li>
                Bypass or attempt to bypass any device anti-tampering algorithms, quota limits, or
                security mechanisms built into the licensing engine.
              </li>
              <li>
                Use the App to capture, process, or sync personal sensitive details of any
                individual without obtaining prior, specific, and informed consent in compliance
                with the DPDP Act 2023.
              </li>
            </ul>

            <h2><i className="fa-solid fa-coins" /> 3. Subscription Plans, Billing &amp; K-Tokens</h2>
            <p>
              Kauntech operates on a Software-as-a-Service (SaaS) subscription model combined with
              a credit economy powered by <strong>K-Tokens</strong>. Different subscription tiers
              contain different scan quotas and token allocations:
            </p>

            <div className="table-container">
              <table className="legal-table">
                <thead>
                  <tr>
                    <th>Subscription Tier</th>
                    <th>Scan Quota / Month</th>
                    <th>Included K-Tokens / Month</th>
                    <th>AI Capabilities Included</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Free</strong></td>
                    <td>49 lifetime scans</td>
                    <td>50 tokens</td>
                    <td>Standard OCR &amp; Basic Custom Fields</td>
                  </tr>
                  <tr>
                    <td><strong>Pro</strong></td>
                    <td>500 scans</td>
                    <td>1,000 tokens (1,250 on annual)</td>
                    <td>On-Device AI Fix, AI Intel Enrichment</td>
                  </tr>
                  <tr>
                    <td><strong>Ultra</strong></td>
                    <td>1,500 scans</td>
                    <td>3,000 tokens</td>
                    <td>AI Strategy, Indian Languages Support</td>
                  </tr>
                  <tr>
                    <td><strong>Custom</strong></td>
                    <td>Unlimited</td>
                    <td>Custom Agreement</td>
                    <td>Dedicated models &amp; on-premises storage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <strong>Tokens Consumption Economy:</strong> The premium on-device and edge AI tools
              consume K-Tokens seamlessly. The billing rate per request is defined as follows:
            </p>
            <ul>
              <li>
                <strong>AI Fix</strong> (1 Token per use): Automated grammatical, capitalization,
                or formatting corrections.
              </li>
              <li>
                <strong>AI Intel</strong> (2 Tokens per scan): Deep enrichment of company
                background, founder intelligence, and size.
              </li>
              <li>
                <strong>AI Strategy</strong> (6 Tokens per scan): Generation of customized B2B cold
                email opener sequences and sales pitches.
              </li>
            </ul>
            <p>
              Subscribers are billed in advance on a recurring monthly or annual billing cycle. All
              payments are securely processed by authorized third-party PSPs (payment service
              providers) and bank rails. Subscriptions automatically renew unless canceled at
              least 24 hours prior to the next billing cycle. All purchases and token top-ups are
              non-refundable except where required by applicable law or the applicable
              platform&apos;s policies (see Section 4).
            </p>

            <h2><i className="fa-brands fa-apple" /> 4. App Store &amp; Google Play Subscription Terms</h2>
            <p>
              If you obtained the App from the Apple App Store or Google Play Store, the following
              platform-specific terms apply in addition to the rest of these Terms. In the event of
              a conflict between these platform terms and the rest of these Terms, the platform
              terms control for purchases made through that platform.
            </p>

            <ul>
              <li>
                <strong>Auto-renewal:</strong> Kauntech subscriptions (Pro and Ultra, monthly or
                annual) are auto-renewing. Your account will be charged for renewal within 24 hours
                prior to the end of the current period at the price of the plan you selected,
                unless you cancel auto-renewal at least 24 hours before the end of the current
                period.
              </li>
              <li>
                <strong>How to manage or cancel:</strong>
                <ul>
                  <li>
                    <strong>iOS / iPadOS:</strong> open the App Store app → tap your profile → tap{" "}
                    <em>Subscriptions</em> → select Kauntech → <em>Cancel Subscription</em>. You
                    can also visit{" "}
                    <a
                      href="https://apps.apple.com/account/subscriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--gold)", textDecoration: "underline" }}
                    >
                      apps.apple.com/account/subscriptions
                    </a>
                    .
                  </li>
                  <li>
                    <strong>Android:</strong> open the Google Play app → tap your profile →{" "}
                    <em>Payments &amp; subscriptions</em> → <em>Subscriptions</em> → select
                    Kauntech → <em>Cancel subscription</em>.
                  </li>
                </ul>
              </li>
              <li>
                <strong>Token top-ups (consumable in-app purchases):</strong> K-Token packs are
                one-time consumable purchases that do not auto-renew. Tokens are credited to your
                Kauntech account upon successful payment and are non-refundable except where
                required by the platform&apos;s policy or applicable law.
              </li>
              <li>
                <strong>Refunds:</strong> Refund requests for Apple App Store purchases must be
                made through Apple at{" "}
                <a
                  href="https://reportaproblem.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", textDecoration: "underline" }}
                >
                  reportaproblem.apple.com
                </a>
                . Refund requests for Google Play purchases must be made through Google Play.
                Kauntech has no ability to process refunds for platform-billed purchases directly.
              </li>
              <li>
                <strong>Deleting your account does not cancel your subscription.</strong> Apple and
                Google bill subscriptions independently of our account system. You must cancel
                your subscription with the platform separately to stop being charged.
              </li>
              <li>
                <strong>Apple End User License Agreement:</strong> If you obtained the App from the
                Apple App Store, your license is also subject to Apple&apos;s standard{" "}
                <a
                  href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--gold)", textDecoration: "underline" }}
                >
                  Licensed Application End User License Agreement
                </a>
                . Apple has no obligation to provide maintenance or support for the App and is not
                responsible for warranty, product claims, intellectual property infringement
                claims, or any product liability arising from your use of the App. Apple and its
                subsidiaries are third-party beneficiaries of these Terms and may enforce them
                against you with respect to the App.
              </li>
            </ul>

            <h2><i className="fa-solid fa-user-slash" /> 5. Account Deletion</h2>
            <p>You may permanently delete your Kauntech account at any time directly from within the App:</p>
            <ol>
              <li>Open the <strong>Configs</strong> tab.</li>
              <li>Switch to the <em>App settings</em> sub-tab.</li>
              <li>Tap <em>Delete Account</em> under the <em>Account</em> section.</li>
              <li>Confirm the deletion request in the modal.</li>
            </ol>
            <p>
              Once requested, your account enters a <strong>30-day grace period</strong> during
              which you may sign back in and tap <em>Cancel deletion</em> to undo the request.
              After the 30-day grace period elapses, the following data is permanently and
              irreversibly purged from our systems:
            </p>
            <ul>
              <li>Your authentication record and profile.</li>
              <li>
                All scanned business cards, contacts, AI enrichment data, and contact tombstones
                associated with your account.
              </li>
              <li>All v-cards, custom QR codes, product catalogues and templates you created.</li>
              <li>
                All settings, integration tokens (Google Sheets, Gmail, Telegram bot credentials,
                webhook configuration) and synchronization preferences.
              </li>
              <li>All voice memos, card images and other media uploaded to your account.</li>
            </ul>
            <p>
              You may also submit a deletion request via the{" "}
              <a href="/delete-request" style={{ color: "var(--gold)", textDecoration: "underline" }}>
                Data Deletion Request Portal
              </a>{" "}
              if you no longer have access to the App.
            </p>
            <p>
              <strong>Active subscriptions are not cancelled automatically.</strong> Because the
              Apple App Store and Google Play handle subscription billing independently of our
              account system, you must cancel any active Kauntech subscription separately using
              the steps in Section 4 above. Deleting your Kauntech account does not stop platform
              billing.
            </p>
            <p>
              Limited information may be retained beyond the 30-day window only where strictly
              required by law (for example, transaction records required for tax or accounting
              compliance under Indian law), and in such cases the data is access-restricted and
              used only for that legal purpose.
            </p>

            <h2><i className="fa-solid fa-circle-nodes" /> 6. Third-Party Integrations &amp; Google OAuth</h2>
            <p>
              Kauntech provides integrations that allow you to sync captured leads directly to
              third-party tools, including <strong>Google Sheets</strong>,{" "}
              <strong>Gmail</strong>, WhatsApp, and Telegram. By connecting these integrations, you
              agree to these specific terms:
            </p>
            <ul>
              <li>
                <strong>Integrations Authorization:</strong> Connecting your Google account
                initiates the Google OAuth protocol. You authorize Kauntech to request access to
                the specific scopes necessary to carry out the operations (e.g., creating and
                writing contacts to Google Sheets, sending email drafts via Gmail).
              </li>
              <li>
                <strong>Data Direct Dispatch:</strong> All data transmitted via Google OAuth is
                sent directly from your device to Google API endpoints using the authorized access
                token. We never route, cache, view, or retain your Google Sheets documents or
                Gmail drafts on our core servers.
              </li>
              <li>
                <strong>Service Terms:</strong> You must comply with all third-party Terms of
                Service (e.g., Google Terms of Service, Google API Services User Data Policy) when
                accessing these integrations.
              </li>
            </ul>

            <div className="alert-box">
              <h4><i className="fa-solid fa-shield-halved" /> Google Limited Use Compliance</h4>
              <p style={{ marginBottom: 0 }}>
                Kauntech&apos;s use and transfer of information received from Google APIs to any
                other app will strictly adhere to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--indigo)", textDecoration: "underline", fontWeight: 700 }}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We do not use, transfer, sell, or analyze
                your Google API data for generalized AI training or marketing.
              </p>
            </div>

            <h2><i className="fa-solid fa-shield-halved" /> 7. DPDP Act 2023 &amp; Privacy</h2>
            <p>
              Your privacy and data transparency are paramount. By using Kauntech, you agree to the
              collection, processing, and storage of account credentials, plans metadata, and
              consent tokens as outlined in our <strong>Privacy Policy</strong>.
            </p>
            <p>
              Because Kauntech is designed to comply with India&apos;s{" "}
              <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>, you agree that you
              are the <i>Data Fiduciary</i> or <i>Data Processor</i> for any contacts you scan. You
              must ensure you have a legitimate, legal basis (such as informed, specific consent or
              legitimate B2B corporate interactions) before scanning or enriching anyone&apos;s
              physical business card or digital contact details.
            </p>

            <h2><i className="fa-solid fa-skull-crossbones" /> 8. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              THE SITE, APP, AND SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              KAUNTECH TECHNOLOGIES PVT. LTD. DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED
              TO, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OCR ACCURACY, AI ENRICHMENT
              RELIABILITY, AND NON-INFRINGEMENT.
            </p>
            <p>
              IN NO EVENT SHALL KAUNTECH BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, USE, GOODWILL, OR
              BUSINESS INTERRUPTIONS, ARISING OUT OF OR IN CONNECTION WITH THE USE OF OR INABILITY
              TO USE THE APP OR SERVICES, REGARDLESS OF THE LEGAL THEORY, EVEN IF ADVISED OF THE
              POSSIBILITY OF SUCH DAMAGES.
            </p>

            <h2><i className="fa-solid fa-gavel" /> 9. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms and your relationship with Kauntech shall be governed by, construed, and
              enforced in accordance with the laws of <strong>India</strong>, without regard to
              conflict of law principles. Any legal action, dispute, or proceeding arising under
              or in connection with these Terms shall be subject to the exclusive jurisdiction of
              the competent courts located in <strong>Mumbai, Maharashtra, India</strong>.
            </p>

            <h2><i className="fa-solid fa-circle-info" /> 10. Changes to These Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify, update, or replace these
              Terms at any time. If a revision is material, we will provide at least 15 days&apos;
              notice prior to any new terms taking effect via an in-app alert or notification on
              our Site. Your continued use of the App or Site following the expiration of the
              notice period constitutes your binding acceptance of the updated Terms.
            </p>

            <h2><i className="fa-solid fa-envelope-open-text" /> 11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or legal disputes regarding these Terms of
              Service, please contact our legal compliance team:
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
              Attn: Legal Compliance &amp; Grievance Officer
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
