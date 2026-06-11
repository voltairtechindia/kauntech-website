import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Setup Guide",
  description:
    "Set up Kauntech auto-sync: push every scanned business card to a webhook endpoint or straight into your own Google Sheet using a no-sign-in Apps Script.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help & Setup Guide | Kauntech",
    description:
      "Set up Kauntech auto-sync: webhook delivery and no-sign-in Google Sheets via Apps Script.",
    url: "/help",
  },
};

const codeBlockStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.35)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "16px 18px",
  overflowX: "auto",
  fontFamily: "var(--mono)",
  fontSize: "0.8rem",
  lineHeight: 1.6,
  color: "var(--text)",
  whiteSpace: "pre",
  margin: "0 0 24px",
};

const APPS_SCRIPT_CODE = `/**
 * KaunTech → Google Sheets
 * 1. Open the Google Sheet you want to fill.
 * 2. Extensions ▸ Apps Script, delete any code, paste this, Save.
 * 3. Deploy ▸ New deployment ▸ Web app.
 *      - Execute as:      Me
 *      - Who has access:  Anyone
 * 4. Authorize, then copy the Web app URL (ends with /exec) into KaunTech.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (ignore) {}
  try {
    var body = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabName = String(body.tab || 'All Leads').slice(0, 99);
    var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

    var headers = body.headers || [];
    var values = body.values || [];
    var idCol = headers.length; // hidden "_id" is always the last column

    // First write to a fresh tab: lay down the header row.
    if (sheet.getLastRow() === 0 && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      if (idCol > 0) sheet.hideColumns(idCol);
    }

    var id = String(body.id || '');
    var event = String(body.event || 'contact.created');

    // Find an existing row by hidden _id (update + idempotent retries).
    var rowIndex = -1;
    var lastRow = sheet.getLastRow();
    if (id && idCol > 0 && lastRow > 1) {
      var ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === id) { rowIndex = i + 2; break; }
      }
    }

    if (event === 'contact.deleted') {
      if (rowIndex > 0) sheet.deleteRow(rowIndex);
      return json({ ok: true, action: 'delete', tab: tabName, url: ss.getUrl() });
    }

    var targetRow = rowIndex > 0 ? rowIndex : sheet.getLastRow() + 1;
    var range = sheet.getRange(targetRow, 1, 1, values.length);
    range.setNumberFormat('@'); // plain text so +91… and =… aren't read as formulas
    range.setValues([values]);

    return json({ ok: true, action: rowIndex > 0 ? 'update' : 'create', tab: tabName, url: ss.getUrl() });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function doGet() {
  return json({ ok: true, service: 'KaunTech', ready: true });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

const PAYLOAD_EXAMPLE = `POST {your-url}
Content-Type: application/json
X-KaunTech-Event: contact.created
X-KaunTech-Signature: sha256=<hex>
X-KaunTech-Retry: 0

{
  "id": "lead_uuid",
  "event": "contact.created",
  "name": "Jane Smith",
  "title": "Head of Sales",
  "company": "Acme Corp",
  "email": "jane@acme.com",
  "phone": "+1234567890",
  "website": "acme.com",
  "address": "...",
  "conference": "TechWeek '26",
  "lead_temperature": "hot",
  "lead_score": 92,
  "product_of_interest": ["enterprise"],
  "notes": "Met at booth 14",
  "scanned_at": "2026-05-24T18:00:00Z"
}`;

const SIGNATURE_SNIPPET = `hmac = HMAC_SHA256(secret, raw_body)
expected = "sha256=" + hex(hmac)
if (expected !== header) reject()`;

export default function HelpPage() {
  return (
    <section className="legal-content">
      <div className="container">
        <div className="legal-card">
          <h1 className="grad-text">Help &amp; Setup Guide</h1>
          <span className="last-updated">
            <i className="fa-solid fa-circle-question" /> Auto-Sync: Webhook &amp; Google Sheets
          </span>

          <div className="legal-body">
            <p>
              Kauntech can push every business card you scan or edit to an external destination
              automatically. Open the app, go to{" "}
              <strong>Configs ▸ Webhook</strong>, and choose one of the two tabs below. Both fire on
              every save — pick whichever fits how you work.
            </p>

            {/* ───────────── Google Sheets ───────────── */}
            <h2>
              <i className="fa-solid fa-table" /> Google Sheets — without signing in
            </h2>
            <p>
              This option sends each lead to a tiny <strong>Google Apps Script</strong> that you
              deploy on your own Google Sheet. Because the script runs inside your account, Kauntech
              never has to ask you to sign in with Google — you simply paste the script&apos;s Web-app
              URL into the app. Each event gets its own tab, only the columns you pick are written,
              and edits update the same row.
            </p>

            <div className="alert-box indigo-alert">
              <h4>
                <i className="fa-solid fa-triangle-exclamation" /> The one setting that matters
              </h4>
              <p style={{ marginBottom: 0 }}>
                When you deploy the Web app, set <strong>Execute as: Me</strong> and{" "}
                <strong>Who has access: Anyone</strong>. If access is &quot;Only myself&quot;, Google
                returns a sign-in page instead of running your script, and Kauntech will show
                &quot;delivery failing&quot;. Re-deploy and paste the new <code>/exec</code> URL to
                fix it.
              </p>
            </div>

            <h3>Step by step</h3>
            <div className="step-list">
              {[
                { t: "Open your Google Sheet", d: "The sheet you want your leads to land in." },
                { t: "Extensions ▸ Apps Script", d: "Delete any sample code, paste the script below, and Save." },
                { t: "Deploy ▸ New deployment ▸ Web app", d: 'Execute as "Me", Who has access "Anyone". Authorize when prompted.' },
                { t: "Copy the Web app URL", d: "It ends in /exec. Paste it into the Google Sheets tab in Kauntech and Save." },
                { t: "Send a test row", d: 'Use the "Send test row" button in the app to confirm everything works.' },
              ].map((s, i) => (
                <div className="step-item" key={s.t}>
                  <div className="step-number">{i + 1}</div>
                  <div className="step-text">
                    <h4>{s.t}</h4>
                    <p>{s.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3>The Apps Script</h3>
            <p>
              You can also copy this straight from the app (the <strong>Copy Apps Script</strong>{" "}
              button). It is a generic row-writer — Kauntech sends the tab name, your chosen columns,
              and the values, so you never have to edit the script when you change your columns.
            </p>
            <pre style={codeBlockStyle}>{APPS_SCRIPT_CODE}</pre>

            <h3>Good to know</h3>
            <ul>
              <li>A separate worksheet/tab is created per event, so leads stay grouped.</li>
              <li>A hidden <code>_id</code> column lets edits update the same row instead of duplicating it.</li>
              <li>Phone numbers and values starting with <code>+</code> or <code>=</code> are stored as plain text, never parsed as formulas.</li>
              <li>Offline scans are queued on your device and synced automatically when you&apos;re back online.</li>
            </ul>

            {/* ───────────── Webhook ───────────── */}
            <h2>
              <i className="fa-solid fa-bolt" /> Webhook — POST to your own endpoint
            </h2>
            <p>
              Prefer to send leads to a CRM, Zapier/Make, or your own API? The Webhook tab fires an
              HTTPS <code>POST</code> with the lead&apos;s full JSON to any endpoint you control,
              every time you save a contact.
            </p>

            <h3>Payload</h3>
            <pre style={codeBlockStyle}>{PAYLOAD_EXAMPLE}</pre>

            <h3>Verifying the signature</h3>
            <p>
              Every request includes an <code>X-KaunTech-Signature</code> header so your server can
              confirm it really came from Kauntech. Recompute the HMAC over the raw request body
              using your signing secret (shown in the Webhook ▸ Settings tab) and compare:
            </p>
            <pre style={codeBlockStyle}>{SIGNATURE_SNIPPET}</pre>

            <div className="alert-box indigo-alert">
              <h4>
                <i className="fa-solid fa-shield-halved" /> Delivery &amp; retries
              </h4>
              <p style={{ marginBottom: 0 }}>
                Respond with a <strong>2xx</strong> status to acknowledge receipt. Kauntech retries
                on network errors and <strong>5xx / 429</strong> responses, and surfaces the last
                error in the app if delivery keeps failing. A <strong>4xx</strong> (other than 429)
                is treated as a misconfiguration and dropped.
              </p>
            </div>

            {/* ───────────── Troubleshooting ───────────── */}
            <h2>
              <i className="fa-solid fa-wrench" /> Troubleshooting
            </h2>
            <ul>
              <li>
                <strong>Sheet shows nothing but the app says it worked:</strong> your Apps Script
                deployment access isn&apos;t &quot;Anyone&quot;. Re-deploy and paste the new{" "}
                <code>/exec</code> URL.
              </li>
              <li>
                <strong>&quot;delivery failing&quot; in the app:</strong> open the URL in a browser —
                if you see a Google sign-in page, the access setting is wrong. If you see{" "}
                <code>{"{ ok: true, ready: true }"}</code>, the script is healthy.
              </li>
              <li>
                <strong>Edited a contact but the row didn&apos;t update:</strong> the original row
                was created before you connected. New rows added after connecting will update in
                place.
              </li>
              <li>
                <strong>Auto-sync is a Pro feature.</strong> Make sure you&apos;re on a Pro plan or
                active trial.
              </li>
            </ul>

            <p style={{ marginTop: 32 }}>
              Still stuck? Email us at{" "}
              <a href="mailto:business@voltairtech.com" style={{ color: "var(--indigo)" }}>
                business@voltairtech.com
              </a>{" "}
              and we&apos;ll help you get set up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
