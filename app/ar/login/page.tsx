import { redirect } from "next/navigation";
import ArHeader from "@/components/ar/ArHeader";
import LoginForm from "@/components/ar/LoginForm";
import { IconBox, IconScan, IconSparkle } from "@/components/ar/icons";
import { arAuthConfigured, getArUser } from "@/lib/ar/appAuth";

export const dynamic = "force-dynamic";

/* The auth callback bounces back here with ?error=missing_code|auth when a
   link is stale or the code exchange fails — surface it instead of silently
   showing the form again. */
const AUTH_ERRORS: Record<string, string> = {
  auth: "That sign-in link didn’t work — it may have expired or already been used. Request a fresh one below.",
  missing_code: "That sign-in link was incomplete. Request a fresh one below and open it on this device.",
};

export default async function ArLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (arAuthConfigured()) {
    const user = await getArUser();
    if (user) redirect("/ar");
  }
  const { error } = await searchParams;
  const authError = error ? AUTH_ERRORS[error] ?? AUTH_ERRORS.auth : null;

  return (
    <>
      <ArHeader />
      <div className="ar-login">
        {/* Left: what the studio is — the same voice as the marketing site. */}
        <div className="ar-login-hero">
          <span className="ar-login-kicker">
            <IconSparkle /> AR Card Studio
          </span>
          <h1 className="ar-login-title">
            Your card, <span className="ar-serif">beyond paper</span>.
          </h1>
          <p className="ar-login-lede">
            Design what appears when someone scans your printed KaunTech card — 3D models, tappable
            buttons, text and video floating over it in augmented reality.
          </p>
          <ul className="ar-login-points">
            <li className="ar-login-point">
              <span className="ar-login-point-ico" aria-hidden>
                <IconScan />
              </span>
              <div>
                <strong>Same account as the app</strong>
                <p>Sign in with your KaunTech app email — your printed cards sync here automatically.</p>
              </div>
            </li>
            <li className="ar-login-point">
              <span className="ar-login-point-ico" aria-hidden>
                <IconBox />
              </span>
              <div>
                <strong>Drag-and-drop 3D studio</strong>
                <p>Place gallery models or your own uploads, wire up links, and see it live as you build.</p>
              </div>
            </li>
            <li className="ar-login-point">
              <span className="ar-login-point-ico" aria-hidden>
                <IconSparkle />
              </span>
              <div>
                <strong>Alive on every scan</strong>
                <p>Anyone who scans your card in the KaunTech app — or its QR — sees your AR scene instantly.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Right: the sign-in panel. Auth flow unchanged (magic link / Google
            against the APP's Supabase project). */}
        <div className="ar-login-panel">
          {authError ? (
            <p className="ar-error" style={{ marginBottom: "var(--ar-sp-lg)" }}>{authError}</p>
          ) : null}
          {arAuthConfigured() ? (
            <LoginForm />
          ) : (
            <div className="ar-card">
              <p className="ar-error" style={{ margin: 0 }}>
                AR sign-in isn’t configured on this environment yet
                (missing NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL / _ANON_KEY).
              </p>
            </div>
          )}
          <p className="ar-login-foot">
            AR cards are a Pro / Ultra feature. New here?{" "}
            <a href="https://www.kauntech.com/get">Get the KaunTech app</a> to create your card first.
          </p>
        </div>
      </div>
    </>
  );
}
