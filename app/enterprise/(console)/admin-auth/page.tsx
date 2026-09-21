import type { Metadata } from "next";
import { redirect } from "next/navigation";
import EnterpriseLoginForm from "@/components/enterprise/EnterpriseLoginForm";
import { arAuthConfigured } from "@/lib/ar/appAuth";
import { getOrgView } from "@/lib/enterpriseConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Enterprise sign-in — KaunTech",
  robots: { index: false, follow: false },
};

const AUTH_ERRORS: Record<string, string> = {
  auth: "That sign-in link didn’t work. It may have expired or already been used. Request a fresh one below.",
  missing_code: "That sign-in link was incomplete. Request a fresh one and open it on this device.",
  not_owner: "That account is on an Enterprise plan but does not manage it. Ask whoever bought the plan to sign in.",
  no_org: "That account is not on an Enterprise plan. If you just bought one, we may not have set it up yet — reply to your quote email.",
};

export default async function EnterpriseAdminAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in AND already an owner: go straight to the console.
  if (arAuthConfigured()) {
    const view = await getOrgView();
    if (view?.role === "owner" && view.status === "active") redirect("/enterprise/admin");
  }

  const { error } = await searchParams;
  const authError = error ? AUTH_ERRORS[error] ?? AUTH_ERRORS.auth : null;

  return (
    <div className="ar-root ec">
      <main className="ec-gate">
        <div className="ec-gate-card">
          <div className="ec-gate-brand">
            <span className="ec-brand-kicker">KaunTech Enterprise</span>
            <h1 className="ec-gate-title">Sign in to your team</h1>
            <p className="ec-sub">See every lead your team scans, add people, and split your yearly allowance.</p>
          </div>

          {authError ? <div className="ec-alert ec-alert--error" role="alert">{authError}</div> : null}

          {arAuthConfigured() ? (
            <EnterpriseLoginForm />
          ) : (
            <div className="ec-alert ec-alert--error">
              Enterprise sign-in isn’t configured on this environment
              (missing NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL / _ANON_KEY).
            </div>
          )}

          <p className="ec-gate-foot">
            No Enterprise plan yet? <a href="/enterprise">Get a quote</a>
          </p>
        </div>
      </main>
    </div>
  );
}
