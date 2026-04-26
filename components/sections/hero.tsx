"use client"

// components/sections/hero.tsx
// ─────────────────────────────────────────────────────────────────────────
// THE APERTURE FIELD — Section 6B
//
// Not a hero section. A field. Two rows of monumental typography rendered
// as apertures (background-clip: text) onto a slow-shifting cobalt /
// platinum / volcanic-orange gradient calibrated against the Liquid
// Obsidian palette. The fluid lives below; the type is the window.
//
// Preserved physics (Section 0):
//   • Velocity-driven letterSpacing + skew on scroll velocity (velocityBus)
//   • Preloader handoff via `preloader-complete` event
//   • webgl-transition dispatch on mount
//
// Visual additions:
//   • Aperture typography (CSS gradient palette, animated)
//   • Left classification column (vertical writing mode)
//   • Right coordinates whisper
//   • Bottom scroll-progress rule with INITIALIZE SEQUENCE label
//   • Text-only CTA "ENTER SYSTEM" with the precision-line hover
//
// Frame system (corner registration marks) is mounted globally in layout.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { velocityBus } from "@/lib/velocity-bus"
import { ease as easeStrings } from "@/lib/easing"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: {
    classification: "SYSTEM ARCHITECT",
    classificationSub: "DUKOVANY NPP",
    coords: "N 50.0755\u00B0  E 14.4378\u00B0",
    cta: "ENTER SYSTEM",
    initSeq: "INITIALIZE SEQUENCE",
  },
  cs: {
    classification: "SYSTÉMOVÝ ARCHITEKT",
    classificationSub: "JE DUKOVANY",
    coords: "N 50.0755\u00B0  E 14.4378\u00B0",
    cta: "VSTOUPIT DO SYSTÉMU",
    initSeq: "INICIALIZAČNÍ SEKVENCE",
  },
}

// The aperture gradient — calibrated against Liquid Obsidian palette:
// cobalt #1B3A6E → platinum #E8E6E1 → volcanic #B8421E. Slow drift.
const APERTURE_BG = `
  radial-gradient(120% 80% at 30% 30%, #1B3A6E 0%, transparent 55%),
  radial-gradient(140% 90% at 75% 60%, #E8E6E1 0%, transparent 45%),
  radial-gradient(100% 70% at 50% 90%, #B8421E 0%, transparent 50%),
  linear-gradient(180deg, #1B3A6E 0%, #E8E6E1 55%, #B8421E 100%)
`

export const Hero = (): React.ReactElement => {
  const containerRef = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const firstRowRef = useRef<HTMLSpanElement>(null)
  const secondRowRef = useRef<HTMLSpanElement>(null)
  const progressFillRef = useRef<HTMLSpanElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const subLabelRef = useRef<HTMLDivElement>(null)
  const { language } = useLanguage()
  const t = DICTIONARY[language as keyof typeof DICTIONARY]

  const [animState, setAnimState] = useState<{ ready: boolean; isBot: boolean }>(
    () => {
      if (typeof window === "undefined") return { ready: false, isBot: false }
      if (sessionStorage.getItem("preloader_played")) {
        const isBot = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(
          navigator.userAgent
        )
        return { ready: true, isBot }
      }
      return { ready: false, isBot: false }
    }
  )

  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("webgl-transition", { detail: { value: 0, color: -1 } })
    )
  }, [])

  // Preloader handoff.
  useEffect(() => {
    const triggerAnim = (e: Event) => {
      const customEvent = e as CustomEvent
      setAnimState({ ready: true, isBot: !!customEvent.detail?.isBot })
    }
    window.addEventListener("preloader-complete", triggerAnim)
    const failsafe = window.setTimeout(() => {
      setAnimState((prev) => (prev.ready ? prev : { ready: true, isBot: false }))
    }, 1800)
    return () => {
      window.removeEventListener("preloader-complete", triggerAnim)
      window.clearTimeout(failsafe)
    }
  }, [])

  // Visibility gate for the velocity rAF.
  useEffect(() => {
    if (!containerRef.current) return
    const io = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "100px" }
    )
    io.observe(containerRef.current)
    return () => io.disconnect()
  }, [])

  // Sacred physics — velocity-driven skew + tracking on the name.
  // Sub-label vertical shift coupled to structural energy.
  useEffect(() => {
    if (!animState.ready || !isVisible) return
    let raf = 0
    const tick = () => {
      const { normalized, intensity } = velocityBus.get()
      const h1 = nameRef.current
      if (h1) {
        const skew = normalized * -3.5
        const tracking = -0.055 - intensity * 0.018
        h1.style.setProperty("--skew", `${skew}deg`)
        h1.style.setProperty("--track", `${tracking}em`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animState.ready, isVisible])

  useGSAP(
    () => {
      const alreadyPlayed =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("preloader_played")

      // Initial state: rows clipped from below — the measurement plate metaphor.
      if (alreadyPlayed || animState.isBot) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          clipPath: "inset(0 0 0% 0)",
          opacity: 1,
          y: 0,
          clearProps: "willChange",
        })
        gsap.set(".hero-ui", { opacity: 1, y: 0 })
      } else if (animState.ready) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          clipPath: "inset(0 0 100% 0)",
          opacity: 1,
        })
        gsap.set(".hero-ui", { opacity: 0, y: 8 })

        const tl = gsap.timeline()
        tl.to(firstRowRef.current, {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.1,
          ease: easeStrings.silk,
        })
          .to(
            secondRowRef.current,
            {
              clipPath: "inset(0 0 0% 0)",
              duration: 1.1,
              ease: easeStrings.silk,
            },
            "-=0.85"
          )
          .to(
            ".hero-ui",
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              ease: easeStrings.silk,
              stagger: 0.08,
            },
            "-=0.55"
          )
      } else {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          clipPath: "inset(0 0 100% 0)",
          opacity: 1,
        })
        gsap.set(".hero-ui", { opacity: 0, y: 8 })
      }

      // Hero exits — the entire field rises and dims.
      gsap.to(containerRef.current, {
        yPercent: 14,
        opacity: 0,
        ease: easeStrings.mechanical,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })

      // Scroll progress rule — fills as the user scrolls through the hero.
      if (progressFillRef.current) {
        gsap.fromTo(
          progressFillRef.current,
          { width: "0%" },
          {
            width: "100%",
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        )
      }
    },
    { scope: containerRef, dependencies: [animState.ready, animState.isBot] }
  )

  return (
    <section
      ref={containerRef}
      id="top"
      className="relative w-full overflow-hidden z-10"
      style={{ height: "100svh" }}
    >
      {/* LEFT CLASSIFICATION COLUMN */}
      <div
        className="hero-ui hidden md:flex absolute z-[3] flex-col items-start gap-3"
        style={{
          left: 28,
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          paddingLeft: 8,
        }}
        aria-hidden
      >
        <span
          className="font-sans font-black"
          style={{
            fontSize: 11,
            letterSpacing: "0.35em",
            color: "rgba(255,255,255,0.45)",
            textTransform: "uppercase",
          }}
        >
          {t.classification}
        </span>
        <span
          aria-hidden
          style={{ width: 24, height: 1, background: "var(--rule-active)" }}
        />
        <span
          className="type-mono-micro-8"
          style={{ color: "var(--text-dim)" }}
        >
          {t.classificationSub}
        </span>
      </div>

      {/* RIGHT COORDINATES */}
      <div
        className="hero-ui hidden md:block absolute z-[3]"
        style={{
          right: 28,
          top: "50%",
          transform: "translateY(-50%) rotate(90deg)",
          transformOrigin: "right center",
          paddingRight: 8,
        }}
        aria-hidden
      >
        <span
          className="type-mono-micro-8"
          style={{ color: "var(--text-data)" }}
        >
          {t.coords}
        </span>
      </div>

      {/* THE APERTURES — two rows of monumental, fluid-windowed typography */}
      <div
        className="absolute inset-0 flex flex-col justify-center items-center z-[2] px-4 sm:px-8"
      >
        <h1
          ref={nameRef}
          aria-label="Tomáš Kratochvíl"
          className="relative text-center w-full"
          style={{
            ["--skew" as string]: "0deg",
            ["--track" as string]: "-0.055em",
            transform: "skewY(var(--skew))",
            letterSpacing: "var(--track)",
            willChange: "transform, letter-spacing",
            transition: "transform 120ms linear, letter-spacing 200ms linear",
            fontFeatureSettings: '"ss01", "ss02", "cv01"',
            fontFamily: "var(--font-sans), sans-serif",
            fontWeight: 900,
            lineHeight: 0.78,
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            className="block w-full overflow-hidden"
            style={{
              clipPath: "inset(0 0 100% 0)",
              willChange: "clip-path",
            }}
            ref={firstRowRef}
          >
            <span
              className="block whitespace-nowrap mx-auto"
              style={{
                fontSize: "clamp(4rem, 16vw, 22rem)",
                background: APERTURE_BG,
                backgroundSize: "240% 240%",
                animation: "aperture-drift 24s ease-in-out infinite",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                marginLeft: "-0.04em",
              }}
            >
              TOMÁŠ
            </span>
          </span>
          <span
            aria-hidden
            className="block w-full overflow-hidden"
            style={{
              clipPath: "inset(0 0 100% 0)",
              willChange: "clip-path",
              marginTop: "-0.06em",
            }}
            ref={secondRowRef}
          >
            <span
              className="block whitespace-nowrap mx-auto"
              style={{
                fontSize: "clamp(2.6rem, 11.5vw, 16rem)",
                background: APERTURE_BG,
                backgroundSize: "240% 240%",
                animation: "aperture-drift 28s ease-in-out infinite reverse",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                marginRight: "-0.04em",
              }}
            >
              KRATOCHVÍL
            </span>
          </span>
        </h1>

        {/* SUB-LABEL — coupled to structural energy. ±4px vertical shift. */}
        <div
          ref={subLabelRef}
          className="hero-ui mt-8 flex items-center gap-3"
          style={{
            transform: "translateY(var(--coupling-hero-sub, 0px))",
            transition: "transform 80ms linear",
          }}
        >
          <span
            aria-hidden
            style={{ width: 32, height: 1, background: "var(--rule-active)" }}
          />
          <span
            className="type-mono-micro"
            style={{ color: "var(--text-data)" }}
          >
            {t.classification}
          </span>
          <span
            aria-hidden
            style={{ width: 32, height: 1, background: "var(--rule-active)" }}
          />
        </div>
      </div>

      {/* BOTTOM: scroll-progress rule + INITIALIZE SEQUENCE label + CTA */}
      <div
        className="hero-ui absolute z-[4] left-0 right-0"
        style={{ bottom: 32 }}
      >
        <div className="mx-auto max-w-[1200px] px-6 flex flex-col items-center gap-3">
          <button
            ref={ctaRef}
            type="button"
            onClick={() => {
              const el = document.getElementById("about")
              if (!el) return
              el.scrollIntoView({ behavior: "smooth" })
            }}
            className="precision-line"
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 9,
              letterSpacing: "0.45em",
              textTransform: "uppercase",
              color: "var(--text-data)",
              background: "transparent",
              border: "none",
              padding: "8px 4px",
            }}
          >
            {t.cta}
          </button>
          <div
            className="w-full relative"
            style={{ marginTop: 16 }}
            aria-hidden
          >
            <span
              className="type-mono-micro-8 absolute left-1/2"
              style={{
                top: -16,
                transform: "translateX(-50%)",
                color: "var(--text-dim)",
              }}
            >
              {t.initSeq}
            </span>
            <span
              aria-hidden
              style={{
                display: "block",
                width: "100%",
                height: 1,
                background: "var(--rule)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                ref={progressFillRef}
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "0%",
                  background: "rgba(255,255,255,0.35)",
                }}
              />
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes aperture-drift {
          0%, 100% { background-position: 0% 0%; }
          25%      { background-position: 100% 30%; }
          50%      { background-position: 60% 100%; }
          75%      { background-position: 20% 60%; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes aperture-drift { 0%, 100% { background-position: 50% 50%; } }
        }
      `}</style>
    </section>
  )
}
