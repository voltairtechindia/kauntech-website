import type { Metadata } from "next";
import "../../ar/ar.css";
import "./console.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The enterprise console shares the AR studio's design system: the signed-in,
 * app-flavoured corner of the site. ar.css used to load only under /ar, so these
 * pages shipped with every .ar-* class unstyled. Everything in it is namespaced
 * under .ar-root, so loading it here cannot leak onto the quote form at
 * /enterprise, which keeps its own styles.
 *
 * A route group, so URLs stay /enterprise/admin, /enterprise/admin-auth and
 * /enterprise/welcome.
 */
export default function EnterpriseConsoleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
