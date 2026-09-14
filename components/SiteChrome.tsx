"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DeferredChatWidget from "@/components/DeferredChatWidget";
import SmoothScroll from "@/components/motion/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import AuraField from "@/components/ui/AuraField";

/**
 * Renders the marketing chrome (Navbar / Footer / chat widget) around the page,
 * EXCEPT on the gated /ar owner section, which ships its own light, app-flavoured
 * shell (see app/ar/layout.tsx), and /enterprise, which is opened inside the
 * mobile app and must read as one focused form — no nav to wander off into, no
 * footer, and no chat widget covering the submit button on a phone. Keeping
 * this in one client component avoids restructuring every marketing page into
 * a route group.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare =
    pathname === "/ar" ||
    pathname?.startsWith("/ar/") ||
    pathname === "/enterprise" ||
    pathname?.startsWith("/enterprise/");

  if (isBare) return <>{children}</>;

  return (
    <>
      <SmoothScroll />
      <AuraField />
      <CustomCursor />
      <Navbar />
      {children}
      <Footer />
      <DeferredChatWidget />
    </>
  );
}
