"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/compliance", label: "DPDP Compliance" },
  { href: "/compare", label: "Compare" },
  { href: "/pricing", label: "Pricing & Top-Ups" },
  { href: "/blog", label: "Blog" },
  { href: "/career", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            {links.map((l) => (
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
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="mobile-link" onClick={closeMobile}>
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
