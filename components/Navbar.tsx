"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Scale,
  ShieldCheck,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Ic from "@/components/ui/Icon";
import Brand from "@/components/ui/BrandIcons";

// "Product" groups the four single-section product-story pages so the navbar
// stays clean. The pages still exist as standalone routes (good for SEO) - the
// dropdown just collects them under one top-level item.
const productLinks: { href: string; label: string; icon: LucideIcon; desc: string }[] = [
  { href: "/features", label: "Features", icon: Zap, desc: "Offline OCR, AI enrichment & automations" },
  { href: "/how-it-works", label: "How It Works", icon: Workflow, desc: "Capture, enrich & automate in 30s" },
  { href: "/compare", label: "Compare", icon: Scale, desc: "Kauntech vs. other scanners" },
  { href: "/compliance", label: "DPDP Compliance", icon: ShieldCheck, desc: "Built for India's DPDP Act 2023" },
  { href: "/faq", label: "FAQ", icon: CircleHelp, desc: "Offline, DPDP, K-Tokens & pricing answered" },
];

const mainLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

// Flat list for the full-screen mobile menu - product pages first, then the rest.
const mobileLinks = [
  ...productLinks.map(({ href, label }) => ({ href, label })),
  ...mainLinks,
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const isProductActive = productLinks.some((l) => l.href === pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus whenever the route changes.
  useEffect(() => {
    setProductOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close the desktop Product menu on an outside click (covers touch/tablet,
  // where hover doesn't fire).
  useEffect(() => {
    if (!productOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [productOpen]);

  // Lock scroll while the full-screen mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <nav className={`navbar${scrolled ? " scrolled" : ""}`} id="navbar">
        <div className="container">
          <Link href="/" className="brand-container" onClick={closeMobile}>
            <img src="/assets/logo-gold.webp" alt="Kauntech Logo" className="nav-logo-img" width={40} height={40} decoding="async" />
            <span className="logo-text">
              KAUN<span>TECH</span>
            </span>
          </Link>

          <ul className="nav-links" id="nav-links">
            <li className={`nav-dropdown${productOpen ? " open" : ""}`} ref={dropdownRef}>
              <button
                type="button"
                className={`nav-dropdown-trigger${isProductActive ? " active" : ""}`}
                aria-haspopup="true"
                aria-expanded={productOpen}
                onClick={() => setProductOpen((v) => !v)}
              >
                Product <Ic icon={ChevronDown} className="caret" />
              </button>
              <div className="nav-dropdown-menu" role="menu">
                {productLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    role="menuitem"
                    className={pathname === l.href ? "active" : undefined}
                    onClick={() => setProductOpen(false)}
                  >
                    <span className="nav-dd-ic">
                      <Ic icon={l.icon} />
                    </span>
                    <span>
                      <span className="nav-dd-label">{l.label}</span>
                      <span className="nav-dd-desc">{l.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </li>

            {mainLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={pathname === l.href ? "active" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            <Link href="/get" className="nav-cta">
              Start Free Trial <Ic icon={ArrowRight} />
            </Link>
          </div>

          <button
            className={`hamburger${mobileOpen ? " active" : ""}`}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      <div className={`mobile-menu${mobileOpen ? " active" : ""}`}>
        <nav className="mm-links" aria-label="Mobile">
          <span className="mm-label">Menu</span>
          {mobileLinks.map((l, i) => (
            <Link
              key={l.href}
              href={l.href}
              className={`mm-link${pathname === l.href ? " active" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onClick={closeMobile}
            >
              <span className="mm-link-idx">{String(i + 1).padStart(2, "0")}</span>
              {l.label}
              <Ic icon={ArrowUpRight} />
            </Link>
          ))}
        </nav>

        <div className="mm-foot">
          <Link href="/get" className="nav-cta" onClick={closeMobile}>
            Start Free Trial <Ic icon={ArrowRight} />
          </Link>
          <div className="mm-social">
            <a href="https://www.linkedin.com/company/120934522/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Brand name="linkedin" />
            </a>
            <a href="https://www.instagram.com/kauntech/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <Brand name="instagram" />
            </a>
            <a href="https://discord.gg/AVYMsrhk" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <Brand name="discord" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
