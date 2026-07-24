import type { Metadata } from "next";
import "./ar.css";

export const metadata: Metadata = {
  title: "AR Card Studio",
  description: "Set up the 3D / AR model that appears when people scan your KaunTech card.",
  robots: { index: false, follow: false },
};

/**
 * Shell for the gated owner section. Deliberately minimal - the marketing
 * Navbar/Footer are suppressed for /ar (see components/SiteChrome.tsx) and each
 * page renders its own <ArHeader/>. Individual protected pages call getArUser()
 * and redirect to /ar/login; this layout stays public so /ar/login can render.
 */
export default function ArLayout({ children }: { children: React.ReactNode }) {
  return <div className="ar-root">{children}</div>;
}
