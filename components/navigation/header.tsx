"use client"

/**
 * header.tsx — slim navigation chrome.
 *
 *  Owns:
 *    • Brand mark ("TOMÁŠ K." → home anchor)
 *    • Anchor nav (About / Work / Capabilities / Contact) with hover scramble
 *    • Language toggle
 *    • Wall-clock time (low-frequency, 1Hz)
 *    • Hamburger + mobile overlay
 *
 *  Does NOT own (moved to system overlay layer):
 *    • System telemetry strip (SEC / SECTION / SYS_DEPTH / FPS / UPTIME)
 *    • Scroll progress percentage / hairline
 *    • Section observer / handshake state machine
 *    • Click pulse counter
 *
 *  All of the above now live in <VelocityDriver /> + <FrameSystem /> +
 *  <TelemetryPanel />, mounted once via <SystemOverlay /> in the root layout.
 *
 *  Motion notes:
 *    • Reveal — single GSAP fromTo on .sys-element. No staircase.
 *    • Nav hover — 400ms ASCII scramble (already audit-spec'd, kept).
 *    • Mobile — clip-path circle wipe overlay (kept).
 */

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { useLenis } from "lenis/react"
import { Globe, Circle } from "lucide-react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease, dur } from "@/lib/motion"

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP)

const NAV_ITEMS = [
  { label: "About",        id: "#about"        },
  { label: "Work",         id: "#work"         },
  { label: "Capabilities", id: "#capabilities" },
  { label: "Contact",      id: "#contact"      },
]

// ── ASCII SCRAMBLE — hover decryption effect ───────────────────────────
// Total duration FIXED at 400ms. 30% chaos warm-up, then per-character
// staggered lock-in across the remaining 280ms. Throttled to ~60fps via
// rAF gating. Pure DOM writes via ref — zero React re-renders per frame.
const SCRAMBLE_CHARS = "!@#$%&*<>/?^~+=-|[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const SCRAMBLE_TOTAL = dur.bar          // 400ms
const SCRAMBLE_WARMUP_RATIO = 0.30
const SCRAMBLE_THROTTLE = 16

const ScrambleText = ({ text, active }: { text: string; active: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const el = ref.current
    if (!el) return
    if (!active) { el.textContent = text; return }

    const startTime = performance.now()
    const warmup = SCRAMBLE_TOTAL * SCRAMBLE_WARMUP_RATIO
    const lockWindow = SCRAMBLE_TOTAL - warmup
    const lockAt = text.split("").map(
      (_, i) => warmup + (i / Math.max(1, text.length - 1)) * lockWindow,
    )
    let lastWrite = 0

    const tick = (now: number) => {
      const elapsed = now - startTime
      if (now - lastWrite >= SCRAMBLE_THROTTLE) {
        lastWrite = now
        let out = ""
        for (let i = 0; i < text.length; i++) {
          out += elapsed >= lockAt[i]
            ? text[i]
            : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0]
        }
        if (ref.current) ref.current.textContent = out
      }
      if (elapsed < SCRAMBLE_TOTAL) rafRef.current = requestAnimationFrame(tick)
      else if (ref.current) ref.current.textContent = text
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, text])

  return (
    <span
      ref={ref}
      style={{ fontVariantNumeric: "tabular-nums", display: "inline-block" }}
    >
      {text}
    </span>
  )
}

// ── HAMBURGER ──────────────────────────────────────────────────────────
const HamburgerButton = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)
  const line3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      gsap.to(line1Ref.current, { rotate:  45, y:  6, duration: 0.32, ease: ease.mechanical })
      gsap.to(line2Ref.current, { opacity: 0, scaleX: 0, duration: 0.18, ease: ease.mechanical })
      gsap.to(line3Ref.current, { rotate: -45, y: -6, duration: 0.32, ease: ease.mechanical })
    } else {
      gsap.to(line1Ref.current, { rotate: 0, y: 0, duration: 0.32, ease: ease.silk })
      gsap.to(line2Ref.current, { opacity: 1, scaleX: 1, duration: 0.28, ease: ease.silk, delay: 0.08 })
      gsap.to(line3Ref.current, { rotate: 0, y: 0, duration: 0.32, ease: ease.silk })
    }
  }, [isOpen])

  return (
    <button
      onClick={onClick}
      className="md:hidden relative z-[200] w-10 h-10 flex flex-col items-center justify-center gap-1.5 pointer-events-auto"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
    >
      <div ref={line1Ref} className="w-6 h-[2px] origin-center" style={{ background: "var(--color-bone)" }} />
      <div ref={line2Ref} className="w-6 h-[2px] origin-center" style={{ background: "var(--color-bone)" }} />
      <div ref={line3Ref} className="w-6 h-[2px] origin-center" style={{ background: "var(--color-bone)" }} />
    </button>
  )
}

// ── MOBILE OVERLAY ─────────────────────────────────────────────────────
const MobileMenuOverlay = ({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean
  onClose: () => void
  onNavigate: (id: string) => void
}) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const lenis = useLenis()
  const { language, toggleLanguage } = useLanguage()

  useEffect(() => {
    if (!overlayRef.current) return

    if (isOpen) {
      lenis?.stop()
      document.body.style.overflow = "hidden"
      gsap.set(overlayRef.current, { display: "flex" })

      const tl = gsap.timeline()
      tl.fromTo(
        overlayRef.current,
        { clipPath: "circle(0% at calc(100% - 40px) 40px)" },
        { clipPath: "circle(150% at calc(100% - 40px) 40px)", duration: 0.7, ease: ease.mechanical },
      ).fromTo(
        ".mobile-nav-item",
        { x: 50, opacity: 0, filter: "blur(8px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.65, stagger: 0.07, ease: ease.silk },
        "-=0.35",
      ).fromTo(
        ".mobile-nav-footer",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: ease.decay },
        "-=0.25",
      )
    } else {
      lenis?.start()
      document.body.style.overflow = ""

      const tl = gsap.timeline({
        onComplete: () => {
          if (overlayRef.current) gsap.set(overlayRef.current, { display: "none" })
        },
      })
      tl.to(".mobile-nav-item", {
        x: -30, opacity: 0, filter: "blur(8px)",
        duration: 0.32, stagger: 0.04, ease: ease.mechanical,
      }).to(
        overlayRef.current,
        { clipPath: "circle(0% at calc(100% - 40px) 40px)", duration: 0.55, ease: ease.mechanical },
        "-=0.2",
      )
    }
  }, [isOpen, lenis])

  const handleNavClick = (id: string) => { onNavigate(id); onClose() }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[180] backdrop-blur-2xl flex-col justify-center items-center hidden"
      style={{
        background: "color-mix(in oklab, var(--color-obsidian) 98%, transparent)",
        clipPath: "circle(0% at calc(100% - 40px) 40px)",
      }}
    >
      <div className="pointer-events-none absolute top-6 left-6 text-hud-sm" style={{ color: "color-mix(in oklab, var(--color-bone) 35%, transparent)" }}>
        SYS · NAV · 00
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 text-hud-sm" style={{ color: "color-mix(in oklab, var(--color-bone) 35%, transparent)" }}>
        SECURE
      </div>

      <nav className="flex flex-col items-center gap-6 sm:gap-8">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.label}
            onClick={() => handleNavClick(item.id)}
            className="mobile-nav-item group relative overflow-hidden py-1"
          >
            <span
              className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tighter block"
              style={{ color: "var(--color-bone)", transition: `transform ${dur.long}ms ${ease.silk}`, willChange: "transform" }}
            >
              <span className="inline-block group-hover:-translate-y-[110%]" style={{ transition: `transform ${dur.bar}ms ${ease.silk}` }}>
                {item.label}
              </span>
            </span>
            <span
              className="absolute top-0 left-0 w-full text-center font-display italic text-4xl sm:text-5xl lowercase translate-y-[110%] group-hover:translate-y-0"
              style={{
                color: "color-mix(in oklab, var(--color-bone) 80%, transparent)",
                transition: `transform ${dur.long}ms ${ease.silk}`,
                willChange: "transform",
              }}
            >
              {item.label}
            </span>
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-hud-sm" style={{ color: "color-mix(in oklab, var(--color-bone) 35%, transparent)" }}>
              0{i + 1}
            </span>
          </button>
        ))}
      </nav>

      <div className="mobile-nav-footer absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-hud-sm"
          style={{
            color: "var(--color-bone)",
            border: "1px solid color-mix(in oklab, var(--color-bone) 25%, transparent)",
            transition: `background ${dur.short}ms ${ease.mechanical}`,
          }}
        >
          <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
          <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
        </button>

        <div className="flex flex-col items-center gap-2" style={{ color: "color-mix(in oklab, var(--color-bone) 45%, transparent)" }}>
          <span className="text-hud-sm">System Architect</span>
          <div className="w-8 h-px" style={{ background: "color-mix(in oklab, var(--color-bone) 25%, transparent)" }} />
          <span className="text-hud-sm">Czech Republic</span>
        </div>
      </div>
    </div>
  )
}

// ── HEADER ─────────────────────────────────────────────────────────────
export const Header = () => {
  const containerRef = useRef<HTMLElement>(null)
  const lenis = useLenis()
  const { language, toggleLanguage } = useLanguage()

  const [time, setTime] = useState<string>("00:00:00")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Wall-clock — once a second is plenty.
  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("cs-CZ", { hour12: false }))
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleScrollTo = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault()
      const target = document.querySelector<HTMLElement>(targetId)
      if (!target) return
      if (lenis) {
        lenis.scrollTo(target, {
          offset: 0,
          duration: 1.5,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        })
      } else {
        target.scrollIntoView({ behavior: "smooth" })
      }
    },
    [lenis],
  )

  const handleMobileNavigate = useCallback(
    (targetId: string) => {
      const target = document.querySelector<HTMLElement>(targetId)
      if (!target) return
      setTimeout(() => {
        if (lenis) {
          lenis.scrollTo(target, {
            offset: 0,
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          })
        } else {
          target.scrollIntoView({ behavior: "smooth" })
        }
      }, 300)
    },
    [lenis],
  )

  // Single fade-in. No staircase, no scroll-trigger choreography.
  useGSAP(
    () => {
      gsap.fromTo(
        ".sys-element",
        { y: -16, opacity: 0, filter: "blur(6px)" },
        {
          y: 0, opacity: 1, filter: "blur(0px)",
          duration: dur.long / 1000, stagger: 0.08,
          ease: ease.silk, delay: 0.2,
        },
      )
    },
    { scope: containerRef },
  )

  return (
    <>
      <header
        ref={containerRef}
        className="fixed top-0 left-0 w-full px-6 py-7 md:px-12 md:py-9 flex justify-between items-start z-[160] pointer-events-none mix-blend-difference"
        style={{ color: "var(--color-bone)" }}
      >
        {/* ─── LEFT — BRAND ─── */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <Link
            href="/"
            onClick={(e) => handleScrollTo(e, "body")}
            className="sys-element font-display font-black text-2xl tracking-tighter uppercase leading-none"
            style={{
              color: "var(--color-bone)",
              transition: `opacity ${dur.short}ms ${ease.mechanical}`,
            }}
          >
            TOMÁŠ K.
          </Link>
          <div className="sys-element flex flex-col text-hud-sm uppercase mt-1" style={{ color: "color-mix(in oklab, var(--color-bone) 70%, transparent)" }}>
            <span>Next.js Architect</span>
            <span style={{ color: "color-mix(in oklab, var(--color-bone) 45%, transparent)" }}>Creative Engineering · Nuclear Precision</span>
          </div>
        </div>

        {/* ─── RIGHT — NAV CLUSTER ─── */}
        <div className="flex flex-col items-end pointer-events-auto max-w-[65vw]">
          <div className="sys-element md:hidden">
            <HamburgerButton isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          </div>

          {/* Top row: language toggle + wall clock. Telemetry strip lives in TelemetryPanel. */}
          <div
            className="sys-element hidden md:flex flex-wrap justify-end items-center gap-x-5 gap-y-2 text-hud uppercase"
            style={{ color: "var(--color-bone)" }}
          >
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:opacity-60 cursor-pointer"
              style={{ transition: `opacity ${dur.short}ms ${ease.mechanical}` }}
            >
              <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
              <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Circle className="w-1.5 h-1.5 fill-current animate-pulse" />
              <span className="tabular-nums">{time}</span>
            </div>
          </div>

          {/* Anchor nav — clean column, no staircase animation. */}
          <nav className="sys-element relative hidden md:flex flex-col items-end gap-2 mt-5">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item.label}
                href={item.id}
                onClick={(e) => handleScrollTo(e, item.id)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx((prev) => (prev === i ? null : prev))}
                className="flex items-center gap-3 font-sans text-sm tracking-[0.1em] uppercase py-1 cursor-pointer"
                style={{
                  color: "var(--color-bone)",
                  transition: `opacity ${dur.short}ms ${ease.mechanical}`,
                }}
              >
                <span className="inline-flex items-baseline">
                  <ScrambleText text={item.label} active={hoveredIdx === i} />
                </span>
                <span
                  className="text-hud-sm"
                  style={{
                    color: "color-mix(in oklab, var(--color-bone) 35%, transparent)",
                    opacity: hoveredIdx === i ? 1 : 0.5,
                    transition: `opacity ${dur.short}ms ${ease.mechanical}`,
                  }}
                >
                  {`0${i + 1}`}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <MobileMenuOverlay
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleMobileNavigate}
      />
    </>
  )
}
