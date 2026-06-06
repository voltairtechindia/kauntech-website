"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// "Product" groups the four single-section product-story pages so the navbar
// stays clean. The pages still exist as standalone routes (good for SEO) — the
// dropdown just collects them under one top-level item.
const productLinks = [
  { href: "/features", label: "Features", icon: "fa-bolt", desc: "Offline OCR, AI enrichment & automations" },
  { href: "/how-it-works", label: "How It Works", icon: "fa-wand-magic-sparkles", desc: "Capture, enrich & automate in 30s" },
  { href: "/compare", label: "Compare", icon: "fa-scale-balanced", desc: "Kauntech vs. other scanners" },
  { href: "/compliance", label: "DPDP Compliance", icon: "fa-shield-halved", desc: "Built for India's DPDP Act 2023" },
];

const mainLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const isProductActive = productLinks.some((l) => l.href === pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the desktop Product menu whenever the route changes.
  useEffect(() => {
    setProductOpen(false);
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

  // When the mobile menu opens, pre-expand Product if we're on one of its pages.
  useEffect(() => {
    if (mobileOpen) setMobileProductOpen(isProductActive);
  }, [mobileOpen, isProductActive]);

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
                Product <i className="fa-solid fa-chevron-down caret" aria-hidden="true" />
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
                    <i className={`fa-solid ${l.icon}`} aria-hidden="true" />
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
            <Link href="/pricing" className="nav-cta">
              Start Free Trial
            </Link>
          </div>

          <button
            className={`hamburger${mobileOpen ? " active" : ""}`}
            aria-label="Toggle navigation"
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
        <button
          type="button"
          className={`mobile-product-toggle${mobileProductOpen ? " open" : ""}${isProductActive ? " active" : ""}`}
          aria-expanded={mobileProductOpen}
          onClick={() => setMobileProductOpen((v) => !v)}
        >
          Product <i className="fa-solid fa-chevron-down caret" aria-hidden="true" />
        </button>
        {mobileProductOpen && (
          <div className="mobile-sublinks">
            {productLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`mobile-sublink${pathname === l.href ? " active" : ""}`}
                onClick={closeMobile}
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}

        {mainLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`mobile-link${pathname === l.href ? " active" : ""}`}
            onClick={closeMobile}
          >
            {l.label}
          </Link>
        ))}

        <div className="mobile-actions">
          <Link href="/pricing" className="nav-cta" onClick={closeMobile}>
            Start Free Trial
          </Link>
        </div>
      </div>
    </>
  );
}
