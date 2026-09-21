import type { Metadata } from "next";
import WelcomeSetPassword from "@/components/enterprise/WelcomeSetPassword";

export const metadata: Metadata = {
  title: "Join your team — KaunTech",
  robots: { index: false, follow: false },
};

// The session arrives in the URL fragment, which the server never sees, so the
// whole page is the client component.
export default function EnterpriseWelcomePage() {
  return <WelcomeSetPassword />;
}
