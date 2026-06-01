import type { Metadata } from "next";

// Hidden, recruitment-specific privacy notice. Unlike the main app Privacy
// Policy (which describes the offline-first, zero-server-retention product),
// resume data IS processed server-side — stored in Supabase, parsed by AI, and
// embedded for HR shortlisting. This page documents that honestly. It is
// intentionally kept out of the sitemap/nav and set to noindex; it's reached
// only from the careers application consent checkbox.
export const metadata: Metadata = {
  title: "Recruitment Privacy Notice",
  description:
    "How Kauntech collects, processes, stores, and protects job applicant data and resumes under the DPDP Act 2023.",
  alternates: { canonical: "/recruitment-privacy" },
  robots: { index: false, follow: false },
};

export default function RecruitmentPrivacyPage() {
  return (
    <section className="legal-content">
      <div className="container">
        <div className="legal-card">
          <h1 className="grad-text">Recruitment Privacy Notice</h1>
          <span className="last-updated">
            <i className="fa-solid fa-calendar-days" /> Last Updated: June 1, 2026
          </span>

          <div className="legal-body">
            <p>
              This notice explains how <strong>Kauntech Technologies Pvt. Ltd.</strong>{" "}
              (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, stores, and
              protects the personal data you provide when you apply for a role through our{" "}
              <strong>careers page</strong>. It is separate from, and takes precedence over, our
              general product Privacy Policy for anything relating to recruitment.
            </p>

            <div className="alert-box indigo-alert">
              <h4>
                <i className="fa-solid fa-circle-info" /> Why this is a separate notice
              </h4>
              <p style={{ marginBottom: 0 }}>
                Our product is offline-first and stores no contact data on our servers. Recruitment
                is different: to assess your application we <strong>do</strong> store your resume
                and details securely on our servers and use AI to help screen candidates. We are
                being explicit about that here so your consent is fully informed, as required by
                the <strong>Digital Personal Data Protection (DPDP) Act 2023</strong>.
              </p>
            </div>

            <h2>
              <i className="fa-solid fa-clipboard-list" /> 1. What We Collect
            </h2>
            <ul>
              <li>
                <strong>Application details</strong> you enter in the form: full name, email,
                phone, location, years of experience, LinkedIn/portfolio links, and your cover
                note.
              </li>
              <li>
                <strong>Your resume file</strong> (PDF or DOCX) and the text and structured
                information extracted from it (skills, work history, education, summary).
              </li>
              <li>
                <strong>The role</strong> you applied for and basic submission metadata (timestamp,
                the page you applied from).
              </li>
            </ul>

            <h2>
              <i className="fa-solid fa-scale-balanced" /> 2. Lawful Basis
            </h2>
            <p>
              We process this data on the basis of <strong>your consent</strong>, which you give by
              ticking the consent box on the application form, and for the legitimate purpose of
              evaluating you for employment. You can withdraw your consent at any time (see
              Section 6); withdrawal does not affect processing already carried out.
            </p>

            <h2>
              <i className="fa-solid fa-robot" /> 3. How We Use It (incl. AI)
            </h2>
            <ul>
              <li>To review and respond to your application.</li>
              <li>
                To <strong>parse your resume using AI</strong> (Google Gemini) into structured
                fields, and to generate a numeric &quot;embedding&quot; of it so our internal HR
                tools can search and shortlist candidates by fit.
              </li>
              <li>
                To contact you about this role or, if relevant, future openings you may be suited
                to.
              </li>
            </ul>
            <p>
              AI is used to <strong>assist</strong> human reviewers, not to make automated final
              hiring decisions. Your resume data is used <strong>only</strong> for recruitment — it
              is never added to our public website chatbot or any customer-facing system.
            </p>

            <h2>
              <i className="fa-solid fa-lock" /> 4. Storage &amp; Security
            </h2>
            <ul>
              <li>
                Resume files are kept in a <strong>private storage bucket</strong> accessible only
                to authorised HR staff via short-lived signed links — they are never publicly
                downloadable.
              </li>
              <li>
                Application records are stored in our access-controlled database, hosted with our
                infrastructure provider (Supabase). Resume parsing is performed by Google&apos;s
                Gemini API.
              </li>
              <li>Access is restricted to the people involved in hiring.</li>
            </ul>

            <h2>
              <i className="fa-solid fa-clock-rotate-left" /> 5. How Long We Keep It
            </h2>
            <p>
              We retain your application for as long as needed to assess it and, where you may be a
              fit for future roles, for up to <strong>24 months</strong>, after which it is deleted.
              You can ask us to delete it sooner at any time.
            </p>

            <h2>
              <i className="fa-solid fa-user-shield" /> 6. Your Rights
            </h2>
            <p>
              Under the DPDP Act 2023 you have the right to access, correct, and erase your data,
              and to withdraw consent. To exercise any of these, email us at{" "}
              <a href="mailto:business@voltairtech.com">business@voltairtech.com</a> with the
              email address you applied with, and we will action your request and delete your
              resume and details.
            </p>

            <h2>
              <i className="fa-solid fa-envelope" /> 7. Contact
            </h2>
            <p>
              Kauntech Technologies Pvt. Ltd. — Data Protection contact:{" "}
              <a href="mailto:business@voltairtech.com">business@voltairtech.com</a>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
