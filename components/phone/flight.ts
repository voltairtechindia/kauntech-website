/**
 * Shared scroll-story choreography constants.
 *
 * Each chapter owns one "segment" of scroll (0 → 1). The beat sheet within a
 * segment — kept identical between the GSAP text timeline (HomeExperience)
 * and the 3D phone rig (PhoneCanvas) so nothing ever overlaps:
 *
 *   [0.00 – 0.50]  chapter text fully visible, phone parked on the empty side
 *   [0.50 – 0.68]  text fades out (up)
 *   [0.52 – 0.98]  phone flies across the viewport (edge-on flip at 0.75)
 *   [0.78 – 1.00]  next chapter's text fades in on the side the phone left
 *
 * Kept in a tiny standalone module (no three.js imports) so HomeExperience
 * can use the numbers without pulling the WebGL bundle in.
 */
export const TEXT_OUT_AT = 0.5; // outgoing text starts leaving
export const TEXT_OUT_DUR = 0.18;
export const TEXT_IN_DUR = 0.22; // incoming text lands exactly at the segment end
export const FLIGHT_START = 0.52; // phone leaves its pose
export const FLIGHT_END = 0.98; // phone lands on the opposite side
export const FLIP_AT = (FLIGHT_START + FLIGHT_END) / 2; // edge-on ⇒ swap the screen here
