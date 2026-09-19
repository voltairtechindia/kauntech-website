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
    <div className="ar-root">
      <div className="ar-container ar-stack" style={{ maxWidth: 460, paddingTop: "var(--ar-sp-3xl)" }}>
        <div>
          <h1 className="ar-h1">Manage your team</h1>
          <p className="ar-muted" style={{ marginTop: "var(--ar-sp-sm)" }}>
            Sign in with the KaunTech account that bought your Enterprise plan. Add people,
            set their passwords, and split your yearly allowance between them.
          </p>
        </div>

        {authError ? <p className="ar-error" style={{ margin: 0 }}>{authError}</p> : null}

        {arAuthConfigured() ? (
          <EnterpriseLoginForm />
        ) : (
          <div className="ar-card">
            <p className="ar-error" style={{ margin: 0 }}>
              Enterprise sign-in isn’t configured on this environment
              (missing NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL / _ANON_KEY).
            </p>
          </div>
        )}

        <p className="ar-muted" style={{ fontSize: 13 }}>
          Don’t have an Enterprise plan yet? <a href="/enterprise">Get a quote</a>.
        </p>
      </div>
    </div>
  );
}
