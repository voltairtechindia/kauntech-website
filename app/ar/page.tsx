import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AR studio",
  robots: { index: false, follow: false },
};

/**
 * The AR studio (sign in, editor, card dashboard) needs a server and is kept on
 * the `vercel-full` branch until it gets one. This page stands in for it.
 */
export default function ArStudioPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        background: "#0B0D12",
        color: "#e6edf3",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>The AR studio is offline for now</h1>
        <p style={{ opacity: 0.8, lineHeight: 1.6, marginBottom: 24 }}>
          We are moving the website to a new host. Need a change to your AR card? Email{" "}
          <a href="mailto:business@voltairtech.com" style={{ color: "#F59E0B" }}>
            business@voltairtech.com
          </a>{" "}
          and we will do it for you.
        </p>
        <Link href="/" style={{ color: "#F59E0B" }}>
          Back to Kauntech
        </Link>
      </div>
    </main>
  );
}
