import { redirect } from "next/navigation";
import ArHeader from "@/components/ar/ArHeader";
import LoginForm from "@/components/ar/LoginForm";
import { arAuthConfigured, getArUser } from "@/lib/ar/appAuth";

export const dynamic = "force-dynamic";

export default async function ArLoginPage() {
  if (arAuthConfigured()) {
    const user = await getArUser();
    if (user) redirect("/ar");
  }

  return (
    <>
      <ArHeader />
      <div className="ar-container" style={{ maxWidth: 520 }}>
        <h1 className="ar-h1" style={{ textAlign: "center", marginBottom: "8px" }}>AR Card Studio</h1>
        <p className="ar-sub" style={{ textAlign: "center", marginBottom: "var(--ar-sp-xl)" }}>
          Design interactive experiences that float directly on top of your physical business card.
        </p>

        <div className="ar-card ar-stack" style={{ marginBottom: "var(--ar-sp-lg)", gap: "14px", background: "var(--ar-orange-soft)", border: "1px solid var(--ar-orange-border)" }}>
          <span className="ar-context-title" style={{ color: "var(--ar-orange-deep)" }}>
            Getting Started:
          </span>
          <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "var(--ar-text-dim)", display: "flex", flexDirection: "column", gap: "8px" }}>
            <li>
              <strong>Use App Account:</strong> Sign in with the exact email address you use on the KaunTech mobile app.
            </li>
            <li>
              <strong>Sync Card Profile:</strong> The Studio automatically pulls your printed cards configured in the app.
            </li>
            <li>
              <strong>Configure 3D & Media:</strong> Upload custom models, videos, and texts in our drag-and-drop studio space.
            </li>
          </ol>
        </div>

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
      </div>
    </>
  );
}
