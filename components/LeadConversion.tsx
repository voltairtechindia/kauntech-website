"use client";

import { useEffect } from "react";
import { contactForm } from "@/lib/gtag";
import { LEAD_FLAG } from "@/components/sections/Contact";

/**
 * Fires the Google Ads / GA4 lead conversion once, on the thank-you page, and
 * only when the visitor actually got here by submitting the contact form.
 * The flag is consumed immediately so a refresh or a shared link never
 * re-counts the lead.
 */
export default function LeadConversion() {
  useEffect(() => {
    let submitted = false;
    try {
      submitted = sessionStorage.getItem(LEAD_FLAG) === "1";
      if (submitted) sessionStorage.removeItem(LEAD_FLAG);
    } catch {
      // storage blocked — skip rather than risk an unearned conversion
    }
    if (submitted) contactForm();
  }, []);

  return null;
}
