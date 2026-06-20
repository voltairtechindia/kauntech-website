"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeferredChatWidget from "@/components/DeferredChatWidget";

/**
 * Renders the marketing chrome (Navbar / Footer / chat widget) around the page,
 * EXCEPT on the gated /ar owner section, which ships its own light, app-flavoured
 * shell (see app/ar/layout.tsx). Keeping this in one client component avoids
 * restructuring every marketing page into a route group.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAr = pathname === "/ar" || pathname?.startsWith("/ar/");

  if (isAr) return <>{children}</>;

  return (
    <>
      <Navbar />
      {children}
      <Footer />
      <DeferredChatWidget />
    </>
  );
}
