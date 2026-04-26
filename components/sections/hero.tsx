"use client"

/**
 * hero.tsx — System Architect · Hero
 *
 *  Layout (mobile-first, fluid up to ~1920w):
 *
 *      [LEFT EDGE]   [CENTRE STACK]                       [RIGHT EDGE]
 *      ┌─ STATUS  ┐  ──────────────────────────────────  ┌─ COORDS ─┐
 *      │ ONLINE   │            T O M Á Š                  │ N 50°.. │
 *      │ SECURE   │       K R A T O C H V Í L             │ E 14°.. │
 *      │          │  SYSTEM · ZERO-ERROR · NUCLEAR        │          │
 *      │          │                                        │          │
 *      └──────────┘  scroll ▾ T-{remaining}                └──────────┘
 *
 *  Motion: name + mission line use the structural-coupling helpers — a
 *  single shared rAF tick (across the whole app) writes their CSS vars.
 *  Reveal sequence (preloader → hero) is unchanged: GSAP timeline once.
 *  Scroll-depth countdown "T-..." reads coreStateBus on every frame via
 *  a DOM ref write (no React re-renders).
 */

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease, dur } from "@/lib/motion"
import {
  compose,
  coupleVelocityNorm,
  coupleVelocityIntensity,
  coupleScrollDepth,
} from "@/lib/structural-coupling"
import { coreStateBus } from "@/lib/core-state-bus"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP)

const DICTIONARY = {
  en: {
    mission: "SYSTEM · ZERO-ERROR TOLERANCE · NUCLEAR PRECISION",
    statusOnline: "ONLINE",
    statusSecure: "SECURE",
    statusReady:  "READY",
    scroll: "ENTER SYSTEM",
  },
  cs: {
    mission: "SYSTÉM · NULOVÁ TOLERANCE · JADERNÁ PRECIZNOST",
    statusOnline: "ONLINE",
    statusSecure: "ZABEZP.",
    statusReady:  "PŘIPRAVEN",
    scroll: "VSTOUPIT",
  },
} as const

const pad3 = (n: number) => Math.max(0, Math.min(999, n)).toString().padStart(3, "0")

export const Hero = () => {
  const containerRef  = useRef<HTMLElement>(null)
  const nameRef       = useRef<HTMLHeadingElement>(null)
  const firstRowRef   = useRef<HTMLSpanElement>(null)
  const secondRowRef  = useRef<HTMLSpanElement>(null)
  const missionRef    = useRef<HTMLDivElement>(null)
  const tickerRef     = useRef<HTMLSpanElement>(null)
  const countdownRef  = useRef<HTMLSpanElement>(null)

  const { language } = useLanguage()
  const t = DICTIONARY[language as keyof typeof DICTIONARY]

  // Reveal gate — preloader-aware, with 1.8s failsafe.
  const [animState, setAnimState] = useState<{ ready: boolean; isBot: boolean }>(
    () => {
      if (typeof window === "undefined") return { ready: false, isBot: false }
      if (sessionStorage.getItem("preloader_played")) {
        const isBot = /Lighthouse|Chrome-Lighthouse|Googlebot|Speed Insights/i.test(
          navigator.userAgent,
        )
        return { ready: true, isBot }
      }
      return { ready: false, isBot: false }
    },
  )

  useEffect(() => {
    // Reset any leftover transition uniform from /work/[id] navigations.
    window.dispatchEvent(
      new CustomEvent("webgl-transition", { detail: { value: 0, color: -1 } }),
    )
  }, [])

  useEffect(() => {
    const triggerAnim = (e: Event) => {
      const ev = e as CustomEvent<{ isBot?: boolean }>
      setAnimState({ ready: true, isBot: !!ev.detail?.isBot })
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

  // ── COUPLING: velocity → CSS vars on the name + mission + ticker ──
  // Ungated: these run continuously, but each helper is cheap (a property
  // write per frame) and they share ONE rAF tick app-wide.
  useEffect(() => {
    const name    = nameRef.current
    const mission = missionRef.current
    const ticker  = tickerRef.current
    if (!name || !mission || !ticker) return
    return compose(
      coupleVelocityNorm(name, "--skew", -4, "deg"),
      coupleVelocityIntensity(name, "--track", -0.02, "em", -0.04),
      coupleVelocityNorm(mission, "--mission-shift", 24, "px"),
      coupleVelocityNorm(ticker, "--drift", 40, "px"),
      coupleScrollDepth(containerRef.current!, "--depth", 1, ""),
    )
  }, [])

  // ── Live "T-XYZ" countdown from coreStateBus.section ──
  // Counts from 1.000 (top of page) down to 0.000 (bottom). Maps to the
  // remaining proportion of the scrollable doc, in milli-units.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = countdownRef.current
      if (el) {
        const p = coreStateBus.get().progress // 0..1
        el.textContent = `T-${pad3(Math.round((1 - p) * 999))}`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Reveal sequence (unchanged contract; only timings via dur tokens) ──
  useGSAP(
    () => {
      const alreadyPlayed =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("preloader_played")

      if (alreadyPlayed || animState.isBot) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 0, opacity: 1, filter: "blur(0px)", clearProps: "willChange",
        })
        gsap.set(".hero-ui", { opacity: 1, y: 0 })
      } else if (animState.ready) {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 110, opacity: 0, filter: "blur(14px)",
        })
        gsap.set(".hero-ui", { opacity: 0, y: 12 })

        const tl = gsap.timeline()
        tl.to(firstRowRef.current, {
          yPercent: 0, opacity: 1, filter: "blur(0px)",
          duration: dur.long / 1000, ease: ease.silk,
        }).to(secondRowRef.current, {
          yPercent: 0, opacity: 1, filter: "blur(0px)",
          duration: dur.long / 1000, ease: ease.silk,
        }, "-=1.05").to(".hero-ui", {
          opacity: 1, y: 0,
          duration: dur.bar / 1000, ease: ease.decay, stagger: 0.12,
        }, "-=0.7")
      } else {
        gsap.set([firstRowRef.current, secondRowRef.current], {
          yPercent: 110, opacity: 0, filter: "blur(14px)",
        })
        gsap.set(".hero-ui", { opacity: 0, y: 12 })
      }

      // Fade the whole hero out as the reader scrolls past it.
      gsap.to(containerRef.current, {
        yPercent: 18, opacity: 0, filter: "blur(14px)",
        ease: ease.mechanical,
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    },
    { scope: containerRef, dependencies: [animState.ready, animState.isBot] },
  )

  return (
    <section
      ref={containerRef}
      data-section-index="0"
      className="relative h-[100svh] w-full flex flex-col justify-center items-center z-10 perspective-[1000px] overflow-hidden"
      style={{ ["--depth" as any]: 0 }}
    >
      {/* ── soft vignette to make the scene cradle the type ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, color-mix(in oklab, var(--color-obsidian) 36%, transparent) 0%, color-mix(in oklab, var(--color-obsidian) 12%, transparent) 55%, transparent 85%)",
        }}
      />

      {/* ═══ LEFT EDGE — STATUS COLUMN ═══ */}
      <div
        className="hero-ui absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col gap-3 z-[2] pointer-events-none"
        style={{ textShadow: "0 0 12px rgba(0,0,0,0.7)" }}
      >
        <StatusPip label={t.statusOnline} kind="bone" />
        <StatusPip label={t.statusSecure} kind="cobalt" />
        <StatusPip label={t.statusReady}  kind="amber" />
      </div>

      {/* ═══ RIGHT EDGE — GEO-COORDS (rotated) ═══ */}
      <div
        className="hero-ui absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-end gap-2 z-[2] pointer-events-none"
        style={{ textShadow: "0 0 12px rgba(0,0,0,0.7)" }}
      >
        <span className="text-hud-sm tabular-nums" style={{ color: "color-mix(in oklab, var(--color-bone) 55%, transparent)" }}>
          N 50.0755
        </span>
        <span className="text-hud-sm tabular-nums" style={{ color: "color-mix(in oklab, var(--color-bone) 55%, transparent)" }}>
          E 14.4378
        </span>
        <span className="block w-px h-10 mt-1" style={{ background: "color-mix(in oklab, var(--color-bone) 30%, transparent)" }} />
      </div>

      {/* ═══ CENTRE — NAME + MISSION ═══ */}
      <div className="relative z-[3] flex flex-col items-center w-full max-w-[100vw] px-4 sm:px-6">
        <h1
          ref={nameRef}
          style={{
            ["--skew" as any]:  "0deg",
            ["--track" as any]: "-0.04em",
            transform: "skewY(var(--skew))",
            letterSpacing: "var(--track)",
            fontFeatureSettings: '"ss01", "ss02", "cv01", "ss03"',
            willChange: "transform, letter-spacing",
            transition: "transform 120ms linear, letter-spacing 200ms linear",
            filter:
              "drop-shadow(0 2px 18px rgba(0,0,0,0.65)) drop-shadow(0 0 42px rgba(0,0,0,0.40)) drop-shadow(0 0 28px rgba(255,255,255,0.06))",
            color: "var(--color-bone)",
          }}
          className="relative font-display font-black leading-[0.82] uppercase text-center w-full flex flex-col items-center"
        >
          <span className="block overflow-hidden w-full">
            <span
              ref={firstRowRef}
              className="block whitespace-nowrap"
              style={{
                fontSize: "clamp(3.2rem, 15vw, 22rem)",
                marginLeft: "-0.04em",
              }}
            >
              TOMÁŠ
            </span>
          </span>
          <span className="block overflow-hidden w-full -mt-[0.06em]">
            <span
              ref={secondRowRef}
              className="block"
              style={{
                fontSize: "clamp(2.2rem, 10.5vw, 15rem)",
                color: "color-mix(in oklab, var(--color-bone) 94%, transparent)",
                marginRight: "-0.04em",
                whiteSpace: "nowrap",
              }}
            >
              KRATOCHVÍL
            </span>
          </span>
        </h1>

        {/* Mission line — couples to velocity for a small horizontal drift */}
        <div
          ref={missionRef}
          className="hero-ui mt-8 sm:mt-10 flex items-center gap-3 sm:gap-4 max-w-full"
          style={{
            ["--mission-shift" as any]: "0px",
            transform: "translateX(var(--mission-shift))",
            willChange: "transform",
            transition: "transform 200ms linear",
          }}
        >
          <span className="block h-px w-6 sm:w-10" style={{ background: "color-mix(in oklab, var(--color-bone) 30%, transparent)" }} />
          <span className="text-hud whitespace-nowrap text-[8px] sm:text-[10px] tracking-[0.32em] sm:tracking-[0.45em]" style={{ color: "color-mix(in oklab, var(--color-bone) 60%, transparent)", textShadow: "0 0 16px rgba(0,0,0,0.75)" }}>
            {t.mission}
          </span>
          <span className="block h-px w-6 sm:w-10" style={{ background: "color-mix(in oklab, var(--color-bone) 30%, transparent)" }} />
        </div>
      </div>

      {/* ═══ BOTTOM — SCROLL INDICATOR + LIVE COUNTDOWN ═══ */}
      <div className="hero-ui absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-[4]">
        <div
          className="w-[1px] h-10 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--color-bone) 40%, transparent), transparent)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-full h-1/2 animate-[bounce_2s_infinite]"
            style={{ background: "var(--color-bone)" }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span
            ref={tickerRef}
            style={{
              ["--drift" as any]: "0px",
              transform: "translateX(var(--drift))",
              willChange: "transform",
              transition: "transform 180ms linear",
              textShadow: "0 0 14px rgba(0,0,0,0.75)",
              color: "color-mix(in oklab, var(--color-bone) 55%, transparent)",
            }}
            className="text-hud"
          >
            {t.scroll}
          </span>
          <span className="block w-px h-3" style={{ background: "color-mix(in oklab, var(--color-bone) 25%, transparent)" }} />
          <span
            ref={countdownRef}
            className="text-hud tabular-nums"
            style={{ color: "color-mix(in oklab, var(--color-bone) 70%, transparent)" }}
          >
            T-999
          </span>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS PIP — small dot + label, color-keyed to one of the brand tokens.
// ─────────────────────────────────────────────────────────────────────────────
const StatusPip = ({ label, kind }: { label: string; kind: "bone" | "cobalt" | "amber" }) => {
  const dotColor =
    kind === "bone"   ? "var(--color-bone)"
  : kind === "cobalt" ? "var(--color-cobalt)"
  :                     "var(--color-amber)"
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="block w-1.5 h-1.5 rounded-full"
        style={{
          background: dotColor,
          boxShadow: `0 0 8px ${dotColor}`,
        }}
      />
      <span
        className="text-hud-sm"
        style={{ color: "color-mix(in oklab, var(--color-bone) 60%, transparent)" }}
      >
        {label}
      </span>
    </div>
  )
}
