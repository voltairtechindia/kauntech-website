"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import StoreBadges from "@/components/sections/StoreBadges";
import CssPhone from "@/components/phone/CssPhone";
import { PHONE_SCREENS, CardScreen } from "@/components/phone/Screens";
import type { PhoneSceneState } from "@/components/phone/PhoneCanvas";
import { TEXT_OUT_AT, TEXT_OUT_DUR, TEXT_IN_DUR, FLIP_AT } from "@/components/phone/flight";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/motion/gsapSetup";
import Ic from "@/components/ui/Icon";
import { ArrowRight, Check, Play } from "lucide-react";

const PhoneCanvas = dynamic(() => import("@/components/phone/PhoneCanvas"), { ssr: false });

/**
 * The home page's cinematic shell: hero + marquee + the pinned scroll story.
 * One persistent 3D iPhone (fixed canvas overlay) flies from the hero into the
 * story, crossing the viewport and flipping between chapters while its live
 * screen swaps to the real app screen being narrated. Mobile / reduced-motion
 * get a stacked story with self-animating CSS phones instead - same content.
 * Chapter names & feature strings mirror the actual app (kauntech-app repo).
 */

type Chapter = {
  kicker: string;
  title: ReactNode;
  body: string;
  bullets: string[];
  screen: number; // index into PHONE_SCREENS
  label: string;
};

const CHAPTERS: Chapter[] = [
  {
    kicker: "01 · Scan",
    label: "Scan",
    title: (
      <>
        Point. It reads the card <em>before you blink.</em>
      </>
    ),
    body: "The OCR engine lives on your phone - not on a server. Auto-capture locks on, reads the card and saves the contact with zero internet. Basement expo hall, airplane mode: doesn't matter.",
    bullets: [
      "Offline-first, on-device OCR",
      "Paper cards, QR codes & NFC tap - one scanner",
      "Auto-capture with front + back dual scan",
    ],
    screen: 1,
  },
  {
    kicker: "02 · Sync",
    label: "Sync",
    title: (
      <>
        One scan. <em>Five destinations.</em> Zero retyping.
      </>
    ),
    body: "The moment a lead is saved, Kauntech routes it: a row in Google Sheets, a drafted WhatsApp intro, a Gmail follow-up, a Telegram post, a webhook to anywhere.",
    bullets: [
      "Sheets · WhatsApp · Gmail · Telegram · Webhooks",
      "Under 30 seconds, scan to synced",
      "Your CRM via webhook - no lock-in",
    ],
    screen: 2,
  },
  {
    kicker: "03 · AI Intel",
    label: "Intel",
    title: (
      <>
        A company dossier, <em>while you shake hands.</em>
      </>
    ),
    body: "Deep AI Intel Scan reads their website, latest news and growth signals - then hands you personalization hooks, decision power and the engagement angle that opens the door.",
    bullets: [
      "Company dossier + latest news & moves",
      "Decision power & personalization hooks",
      "50 tokens per dossier - pay per use",
    ],
    screen: 3,
  },
  {
    kicker: "04 · AI Strategy",
    label: "Strategy",
    title: (
      <>
        The dossier becomes <em>a playbook.</em>
      </>
    ),
    body: "AI Sales Strategy reads the intel and calls the deal - pursue, nurture or pass - then arms you with the opener, the objection to expect and your next move. Your pipeline keeps score in Hot, Warm and Cold.",
    bullets: [
      "Deal Verdict with a confidence score",
      "Openers, objections & next moves",
      "Hot / Warm / Cold pipeline + event tags",
    ],
    screen: 4,
  },
  {
    kicker: "05 · AR Cards",
    label: "AR",
    title: (
      <>
        Your card <em>comes alive</em> in their camera.
      </>
    ),
    body: "Build an AR twin of your V-Card in the kauntech.com/ar studio - 3D logo, intro video, voice note. When someone scans your card with Kauntech, it lifts off the paper. That's the card they remember.",
    bullets: [
      "3D models, video & audio on your card",
      "Design in the browser at kauntech.com/ar",
      "AR cards on Pro & Ultra plans",
    ],
    screen: 5,
  },
];

const SEGMENTS = CHAPTERS.length - 1; // phone flights between chapters
const STORY_TAIL = 0.5; // dwell on the last chapter before the stage unpins (in units)
const STORY_SPAN = SEGMENTS + STORY_TAIL; // total timeline length, 1 unit ≈ 100vh

export default function HomeExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const sceneState = useRef<PhoneSceneState>({ pos: 0, exit: 0, pointer: { x: 0, y: 0 } });
  const chapterRef = useRef(0);
  const [chapter, setChapter] = useState(0);
  const [canvasOn, setCanvasOn] = useState(false); // capability gate (desktop + webgl + motion ok)
  const [canvasLive, setCanvasLive] = useState(true); // lifecycle within the page

  // Capability gate - only mount WebGL on motion-friendly desktops with REAL
  // GPU acceleration. Software renderers (SwiftShader/llvmpipe - headless
  // browsers, GPU-less VMs, Lighthouse bots) technically expose WebGL but run
  // the whole scene on the CPU main thread (~10 s of blocking time), so they
  // get the CssPhone fallback instead - same content, designed for exactly
  // this case.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const check = () => {
      let webgl = false;
      try {
        const c = document.createElement("canvas");
        const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
        if (gl) {
          const dbg = gl.getExtension("WEBGL_debug_renderer_info");
          const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
          webgl = !/swiftshader|llvmpipe|software(rasterizer|adapter)?/i.test(renderer);
        }
      } catch {
        webgl = false;
      }
      setCanvasOn(mq.matches && webgl);
    };
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, []);

  // Pointer parallax feeding the 3D rig.
  useEffect(() => {
    if (!canvasOn) return;
    const onMove = (e: PointerEvent) => {
      sceneState.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      sceneState.current.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [canvasOn]);

  // Hero glow leans toward the cursor. The hero background is opaque, so the
  // global AuraField orb can't show through here - instead the whole glow field
  // drifts a few px toward the pointer while each aurora keeps its own breathe.
  useEffect(() => {
    const bg = heroBgRef.current;
    if (!bg) return;
    if (
      !window.matchMedia("(pointer: fine)").matches ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const toX = gsap.quickTo(bg, "x", { duration: 1.1, ease: "power3.out" });
    const toY = gsap.quickTo(bg, "y", { duration: 1.1, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      toX((e.clientX / window.innerWidth - 0.5) * 52);
      toY((e.clientY / window.innerHeight - 0.5) * 40);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        /* ---- hero intro ---- */
        const h1 = heroCopyRef.current?.querySelector(".k-h1");
        if (h1) {
          const split = SplitText.create(h1, { type: "chars,words,lines", mask: "lines" });
          gsap.from(split.chars, {
            yPercent: 115,
            duration: 0.9,
            ease: "power4.out",
            stagger: { each: 0.014 },
            delay: 0.15,
          });
        }
        gsap.from(".k-hero-copy > *:not(.k-h1)", {
          y: 34,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          delay: 0.55,
          clearProps: "all",
        });

        /* ---- hero scroll: phone drifts toward chapter 1, copy parallaxes away ---- */
        const applyChapter = (c: number) => {
          if (c !== chapterRef.current) {
            chapterRef.current = c;
            setChapter(c);
          }
        };
        ScrollTrigger.create({
          trigger: heroRef.current,
          start: "top top",
          end: "bottom 30%",
          scrub: true,
          onUpdate: (self) => {
            sceneState.current.pos = self.progress;
            // swap the screen exactly when the flight to chapter 1 goes edge-on
            applyChapter(self.progress >= FLIP_AT ? 1 : 0);
          },
        });
        gsap.to(heroCopyRef.current, {
          yPercent: -14,
          autoAlpha: 0.15,
          ease: "none",
          scrollTrigger: { trigger: heroRef.current, start: "top top", end: "bottom top", scrub: true },
        });

        /* ---- pinned story ---- */
        const texts = gsap.utils.toArray<HTMLElement>(".k-chapter", stageRef.current!);
        gsap.set(texts, { autoAlpha: 0, y: 60 });
        gsap.set(texts[0], { autoAlpha: 1, y: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: {
            trigger: stageRef.current,
            start: "top top",
            end: `+=${STORY_SPAN * 100}%`,
            pin: true,
            anticipatePin: 1,
            scrub: 0.7,
            // pause mid-story → glide to the nearest chapter's dwell, so the
            // reader never rests on a half-finished transition
            snap: {
              snapTo: (value: number) => {
                const seg = value * STORY_SPAN;
                if (seg < 0.12 || seg > SEGMENTS + 0.32) return value; // entering/leaving - don't yank
                const i = Math.min(Math.max(Math.round(seg - 0.25), 0), SEGMENTS);
                return (i + 0.25) / STORY_SPAN;
              },
              duration: { min: 0.35, max: 0.9 },
              delay: 0.12,
              ease: "power3.inOut",
            },
            onUpdate: (self) => {
              const seg = Math.min(self.progress * STORY_SPAN, SEGMENTS);
              sceneState.current.pos = 1 + seg;
              // screen/rail/glow swap at the edge-on flip point of the flight
              applyChapter(1 + Math.floor(seg + (1 - FLIP_AT)));
            },
          },
        });

        // Beat sheet per segment (see components/phone/flight.ts): the outgoing
        // text is fully gone BEFORE the incoming one starts, and both are hidden
        // while the phone crosses the middle - nothing ever overlaps.
        texts.forEach((el, i) => {
          if (i > 0) {
            tl.fromTo(
              el,
              { autoAlpha: 0, y: 60 },
              { autoAlpha: 1, y: 0, duration: TEXT_IN_DUR },
              i - TEXT_IN_DUR,
            );
          }
          if (i < texts.length - 1) {
            tl.to(el, { autoAlpha: 0, y: -60, duration: TEXT_OUT_DUR, ease: "power2.in" }, i + TEXT_OUT_AT);
          }
        });
        // keep the timeline the full length so the last chapter dwells
        tl.to({}, { duration: 0.01 }, STORY_SPAN - 0.01);

        /* ---- story exit: the phone rides up and away with the unpinned stage ---- */
        ScrollTrigger.create({
          trigger: storyRef.current,
          start: "bottom bottom",
          end: "bottom 30%",
          scrub: true,
          onUpdate: (self) => {
            sceneState.current.exit = self.progress;
          },
        });

        /* ---- canvas lifecycle: kill WebGL once the story is behind us ---- */
        ScrollTrigger.create({
          trigger: storyRef.current,
          start: "bottom top+=120",
          onEnter: () => setCanvasLive(false),
          onLeaveBack: () => setCanvasLive(true),
        });

        return () => {
          chapterRef.current = 0;
          setChapter(0);
        };
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="k-experience">
      {/* persistent 3D iPhone overlay (desktop only) */}
      {canvasOn && canvasLive && (
        <div className="k-canvas" aria-hidden="true">
          <PhoneCanvas sceneState={sceneState} chapter={chapter} />
        </div>
      )}

      {/* ============================== HERO ============================== */}
      <section className="k-hero" id="hero" ref={heroRef}>
        <div className="k-hero-bg" aria-hidden="true" ref={heroBgRef}>
          <span className="k-aurora k-aurora--ember" />
          <span className="k-aurora k-aurora--indigo" />
          <span className="k-horizon" />
          <span className="k-noise" />
        </div>

        <div className="container k-hero-grid">
          <div className="k-hero-copy" ref={heroCopyRef}>
            <span className="k-kicker">Scan. Save. Outsmart.</span>
            <h1 className="k-h1">
              Never lose a <em>business&nbsp;card</em> again.
            </h1>
            <p className="k-hero-sub">
              Kauntech is India&apos;s first offline-first AI business card scanner - capture, enrich and
              route leads to your CRM in 30 seconds, with every scan processed on your phone. Private by
              architecture, DPDP Act 2023 compliant.
            </p>
            <div className="k-hero-ctas">
              <Link href="/get" className="k-btn k-btn--primary">
                <span>Start Free Trial</span>
                <Ic icon={ArrowRight} />
              </Link>
              <a href="#story" className="k-btn k-btn--ghost">
                <Ic icon={Play} />
                <span>Watch it work</span>
              </a>
            </div>
            <StoreBadges />
            <div className="k-hero-stats">
              <div className="k-stat">
                <b>30s</b>
                <span>Scan to synced lead</span>
              </div>
              <div className="k-stat">
                <b>Offline-first</b>
                <span>OCR runs on-device</span>
              </div>
            </div>
          </div>

          <div className="k-hero-stage" aria-hidden="true">
            {/* mobile / no-WebGL phone - the 3D one takes over on desktop */}
            {!canvasOn && (
              <CssPhone className="k-hero-cssphone" scale={0.66}>
                <CardScreen />
              </CssPhone>
            )}
          </div>
        </div>

        <a href="#story" className="k-scrollcue" aria-label="Scroll to the product tour">
          <span className="k-scrollcue-label">Scroll</span>
          <span className="k-scrollcue-line" />
        </a>
      </section>

      {/* ============================ MARQUEE ============================= */}
      <div className="k-marquee" aria-hidden="true">
        <div className="k-marquee-track">
          {[0, 1].map((n) => (
            <span key={n} className="k-marquee-run">
              Offline-first OCR <i>◆</i> NFC + QR + paper cards <i>◆</i>{" "}
              Deep AI Intel Scan <i>◆</i> 30-second workflow <i>◆</i> Hot / Warm / Cold pipeline <i>◆</i>{" "}
              AR business cards <i>◆</i>{" "}
            </span>
          ))}
        </div>
      </div>

      {/* ============================== STORY ============================= */}
      <section className="k-story" id="story" ref={storyRef}>
        {/* desktop: pinned stage the 3D phone flies through */}
        <div className="k-story-desktop" ref={stageRef}>
          <div
            className="k-story-glow"
            style={{ ["--story-accent" as string]: PHONE_SCREENS[Math.max(chapter, 1)]?.accent ?? "#D97706" }}
          />
          <div className="k-stage-inner">
            {CHAPTERS.map((c, i) => (
              <div className={`k-chapter ${i % 2 === 0 ? "side-r" : "side-l"}`} key={c.label}>
                <span className="k-kicker">{c.kicker}</span>
                <h3 className="k-h3">{c.title}</h3>
                <p>{c.body}</p>
                <ul>
                  {c.bullets.map((b) => (
                    <li key={b}>
                      <Ic icon={Check} /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="k-rail" aria-hidden="true">
              {CHAPTERS.map((c, i) => (
                <span key={c.label} className={`k-rail-item${chapter === i + 1 ? " on" : ""}`}>
                  <i />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* mobile / reduced-motion: stacked chapters with self-animating CSS phones */}
        <div className="k-story-mobile">
          {CHAPTERS.map((c) => {
            const S = PHONE_SCREENS[c.screen].Screen;
            return (
              <div className="k-mchapter" key={c.label}>
                <CssPhone scale={0.62}>
                  <S />
                </CssPhone>
                <div className="k-mchapter-copy">
                  <span className="k-kicker">{c.kicker}</span>
                  <h3 className="k-h3">{c.title}</h3>
                  <p>{c.body}</p>
                  <ul>
                    {c.bullets.map((b) => (
                      <li key={b}>
                        <Ic icon={Check} /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
