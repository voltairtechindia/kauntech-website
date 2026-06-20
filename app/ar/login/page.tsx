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
      <div className="ar-container" style={{ maxWidth: 460 }}>
        <h1 className="ar-h1">AR Card Studio</h1>
        <p className="ar-sub">
          Sign in with your KaunTech account to attach a 3D / AR model to your
          business card. When someone scans your card in the app, your model
          comes alive on top of it.
        </p>
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
