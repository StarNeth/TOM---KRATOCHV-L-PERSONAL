"use client"

import Link from "next/link"
import { useState, useEffect, useRef, useCallback } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useLenis } from "lenis/react"
import { Globe, Activity, Circle } from "lucide-react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"
import { velocityBus } from "@/lib/velocity-bus"

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger)
}

const NAV_ITEMS = [
  { label: "About", id: "#about" },
  { label: "Work", id: "#work" },
  { label: "Capabilities", id: "#capabilities" },
  { label: "Contact", id: "#contact" },
]

// ── ASCII SCRAMBLE ─────────────────────────────────────────────────────
// Decryption-style hover effect. Total duration FIXED at 400ms regardless
// of word length — 120ms of full-chaos scramble, then 280ms of rapid
// per-character lock-in. The lock window scales to fit the word so "About"
// (5 chars) and "Capabilities" (12 chars) both complete at exactly 400ms.
// Writes throttled to ~60fps for maximum readability of the chaos frames.
// Pure DOM writes via ref — zero React re-renders per frame.
const SCRAMBLE_CHARS = "!@#$%&*<>/?^~+=-|[]{}ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const SCRAMBLE_CONFIG = {
  total: 400, // ms total — exactly what the spec asks for
  warmupRatio: 0.30, // first 30% = full chaos (no chars locked)
  throttle: 16, // ~60fps scramble frame rate
}

const ScrambleText = ({ text, active }: { text: string; active: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const el = ref.current
    if (!el) return

    if (!active) {
      el.textContent = text
      return
    }

    const startTime = performance.now()
    const { total, warmupRatio, throttle } = SCRAMBLE_CONFIG
    const warmup = total * warmupRatio
    const lockWindow = total - warmup
    // Each character locks at a staggered point within the lock window.
    const lockAt = text.split("").map(
      (_, i) => warmup + (i / Math.max(1, text.length - 1)) * lockWindow
    )
    let lastWrite = 0

    const tick = (now: number) => {
      const elapsed = now - startTime

      if (now - lastWrite >= throttle) {
        lastWrite = now
        let out = ""
        for (let i = 0; i < text.length; i++) {
          if (elapsed >= lockAt[i]) {
            out += text[i]
          } else {
            out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          }
        }
        if (ref.current) ref.current.textContent = out
      }

      if (elapsed < total) {
        rafRef.current = requestAnimationFrame(tick)
      } else if (ref.current) {
        ref.current.textContent = text
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [active, text])

  return (
    <span
      ref={ref}
      aria-hidden={false}
      // Tabular nums stabilize glyph widths during the scramble — no layout shift.
      style={{ fontVariantNumeric: "tabular-nums", display: "inline-block" }}
    >
      {text}
    </span>
  )
}

// ── MOBILE OVERLAY ──────────────────────────────────────────────────────
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
        {
          clipPath: "circle(150% at calc(100% - 40px) 40px)",
          duration: 0.7,
          ease: ease.mechanical,
        }
      )
        .fromTo(
          ".mobile-nav-item",
          { x: 50, opacity: 0, filter: "blur(8px)" },
          {
            x: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.65,
            stagger: 0.07,
            ease: ease.silk,
          },
          "-=0.35"
        )
        .fromTo(
          ".mobile-nav-footer",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: ease.decay },
          "-=0.25"
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
        x: -30,
        opacity: 0,
        filter: "blur(8px)",
        duration: 0.32,
        stagger: 0.04,
        ease: ease.mechanical,
      }).to(
        overlayRef.current,
        {
          clipPath: "circle(0% at calc(100% - 40px) 40px)",
          duration: 0.55,
          ease: ease.mechanical,
        },
        "-=0.2"
      )
    }
  }, [isOpen, lenis])

  const handleNavClick = (id: string) => {
    onNavigate(id)
    onClose()
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[150] bg-[#020202]/98 backdrop-blur-2xl flex-col justify-center items-center hidden"
      style={{ clipPath: "circle(0% at calc(100% - 40px) 40px)" }}
    >
      {/* Ambient HUD chrome */}
      <div className="pointer-events-none absolute top-6 left-6 font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">
        SYS · NAV · 00
      </div>
      <div className="pointer-events-none absolute bottom-6 right-6 font-mono text-[9px] tracking-[0.4em] text-white/30 uppercase">
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
              className="font-syne font-black text-4xl sm:text-5xl uppercase tracking-tighter text-white block"
              style={{
                transition: `transform 520ms ${ease.silk}`,
                willChange: "transform",
              }}
            >
              <span className="inline-block group-hover:-translate-y-[110%] transition-transform duration-500" style={{ transitionTimingFunction: ease.silk }}>
                {item.label}
              </span>
            </span>
            <span
              className="absolute top-0 left-0 w-full text-center font-instrument italic text-4xl sm:text-5xl lowercase text-white/80 translate-y-[110%] group-hover:translate-y-0"
              style={{
                transition: `transform 520ms ${ease.silk}`,
                willChange: "transform",
              }}
            >
              {item.label}
            </span>
            <span className="absolute -left-6 top-1/2 -translate-y-1/2 font-mono text-[9px] text-white/30 tracking-widest">
              0{i + 1}
            </span>
          </button>
        ))}
      </nav>

      <div className="mobile-nav-footer absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6">
        <button
          onClick={toggleLanguage}
          /* ZMĚNĚNO: text-[10px] na text-sm pro lepší čitelnost na mobilu */
          className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-full font-mono text-sm tracking-widest uppercase text-white hover:bg-white/10"
          style={{ transition: `background 240ms ${ease.mechanical}` }}
        >
          {/* ZMĚNĚNO: w-3 h-3 na w-4 h-4 */}
          <Globe className="w-4 h-4 animate-[spin_8s_linear_infinite]" />
          <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
        </button>

        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase">Creative Developer</span>
          <div className="w-8 h-[1px] bg-white/20" />
          <span className="font-mono text-[8px] tracking-[0.2em]">Czech Republic</span>
        </div>
      </div>
    </div>
  )
}

// ── TELEMETRY ───────────────────────────────────────────────────────────
// Five live values written imperatively into DOM refs — React NEVER
// re-renders per frame. What ships to the HUD:
//
//   SEC       — security handshake status ({SECURE|HANDSHAKE|LOCKED})
//               derived from a micro state machine that listens to
//               velocity events and flashes HANDSHAKE for 280ms on
//               scroll-start transitions (IDLE → NAVIGATING).
//   SECTION   — zero-padded index of the currently-visible major
//               section (00=hero, 01=about, 02=work, 03=capabilities,
//               04=contact). Updated by IntersectionObserver — not
//               by scroll math — so it can never drift from reality.
//   SYS_DEPTH — virtual camera Z in viewport units (scrollY ÷ innerHeight)
//               formatted to 4 decimals. Zero at hero, grows as the
//               reader dolly-pushes through the scene.
//   FPS       — rolling rAF window (60-frame buffer).
//   UPTIME    — ms since mount, formatted HH:MM:SS.
//
// STATE MACHINE
//   BOOT → IDLE → NAVIGATING → SECTION_LOCK
//                     ↓
//                CONTACT_ARMED (section 04 only)
// Transitions are fired by the velocity bus (scroll start/settle) and
// the section observer (04 reached → armed).
const pad2 = (n: number) => n.toString().padStart(2, "0")
const padDepth = (n: number) => n.toFixed(4)

type HUDState =
  | "BOOT"
  | "IDLE"
  | "NAVIGATING"
  | "SECTION_LOCK"
  | "CONTACT_ARMED"

type TelemetryRefs = {
  depth:   React.RefObject<HTMLSpanElement | null>
  fps:     React.RefObject<HTMLSpanElement | null>
  uptime:  React.RefObject<HTMLSpanElement | null>
  sec:     React.RefObject<HTMLSpanElement | null>
  section: React.RefObject<HTMLSpanElement | null>
}

// Minimum system-character pool for the handshake scramble — identical
// to the "military readout" aesthetic spec'd in the brief. 220ms @ ~60Hz
// = 13 frames of scramble noise, then the target string locks in.
const SEC_CHARS = "01ABCDEF_·×◆"
const scrambleSec = (el: HTMLSpanElement, target: string, durMs = 220) => {
  const start = performance.now()
  let raf = 0
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durMs)
    if (t < 1) {
      let out = ""
      for (let i = 0; i < target.length; i++) {
        out += t > i / target.length
          ? target[i]
          : SEC_CHARS[(Math.random() * SEC_CHARS.length) | 0]
      }
      el.textContent = out
      raf = requestAnimationFrame(step)
    } else {
      el.textContent = target
    }
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

const useTelemetry = (): TelemetryRefs => {
  const depth   = useRef<HTMLSpanElement>(null)
  const fps     = useRef<HTMLSpanElement>(null)
  const uptime  = useRef<HTMLSpanElement>(null)
  const sec     = useRef<HTMLSpanElement>(null)
  const section = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const sessionStart = performance.now()
    // Rolling FPS window — genuine 60-frame measurement, not GSAP ticker.
    const frameTimes: number[] = []
    let raf = 0

    // ── STATE MACHINE ──────────────────────────────────────────────
    let hudState: HUDState = "BOOT"
    let lastVelocityAbs = 0
    let navigateReleaseAt = 0
    let sectionIndex = 0

    const transition = (next: HUDState) => {
      if (next === hudState) return
      hudState = next
      if (!sec.current) return
      if (next === "NAVIGATING")     scrambleSec(sec.current, "HANDSHAKE", 220)
      else if (next === "CONTACT_ARMED") scrambleSec(sec.current, "LOCKED",    180)
      else                           scrambleSec(sec.current, "SECURE",    260)
    }

    // ── SECTION OBSERVER ───────────────────────────────────────────
    // Hero is section 00 — it doesn't have an id, so we synthesize a
    // zero-state whenever none of the four content sections are the
    // most-intersecting entry.
    const SECTION_IDS = ["about", "work", "capabilities", "contact"]
    const sectionEls = SECTION_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    const setSectionIndex = (idx: number) => {
      if (idx === sectionIndex) return
      sectionIndex = idx
      if (section.current) section.current.textContent = pad2(idx)
      if (idx === 4) transition("CONTACT_ARMED")
      else if (hudState === "CONTACT_ARMED") transition("SECTION_LOCK")
    }

    let io: IntersectionObserver | null = null
    if (sectionEls.length > 0) {
      io = new IntersectionObserver(
        (entries) => {
          // Pick the entry with the largest intersection ratio that's
          // currently above 0.35 — anything less is "entering" territory.
          let bestIdx = -1
          let bestRatio = 0
          for (const e of entries) {
            if (!e.isIntersecting) continue
            if (e.intersectionRatio > bestRatio && e.intersectionRatio > 0.35) {
              bestRatio = e.intersectionRatio
              bestIdx = SECTION_IDS.indexOf(e.target.id) + 1 // +1 because hero=0
            }
          }
          if (bestIdx < 0 && window.scrollY < window.innerHeight * 0.8) {
            setSectionIndex(0)                // hero still dominant
          } else if (bestIdx > 0) {
            setSectionIndex(bestIdx)
          }
        },
        { threshold: [0.35, 0.55, 0.75] },
      )
      sectionEls.forEach((el) => io!.observe(el))
    }

    const tick = (now: number) => {
      // ── FPS — true rolling rAF window ─────────────────────────
      frameTimes.push(now)
      if (frameTimes.length > 60) frameTimes.shift()
      if (frameTimes.length > 1 && fps.current) {
        const elapsed = now - frameTimes[0]
        const v = Math.round(((frameTimes.length - 1) * 1000) / elapsed)
        fps.current.textContent = pad2(Math.min(99, v))
      }

      // ── SYS_DEPTH — virtual camera z in viewport units ────────
      if (depth.current) {
        const vd = window.scrollY / Math.max(1, window.innerHeight)
        depth.current.textContent = padDepth(vd)
      }

      // ── UPTIME — ms since mount, HH:MM:SS ──────────────────────
      if (uptime.current) {
        const secs = Math.floor((now - sessionStart) / 1000)
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        uptime.current.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      }

      // ── STATE MACHINE DRIVER ───────────────────────────────────
      // BOOT transitions on first tick. NAVIGATING is entered whenever
      // normalized velocity exceeds a small threshold; after 280ms of
      // settled-below-threshold, we drop back to SECTION_LOCK.
      if (hudState === "BOOT") transition("IDLE")
      const vAbs = Math.abs(velocityBus.get().normalized)
      if (vAbs > 0.03 && lastVelocityAbs <= 0.03) {
        transition("NAVIGATING")
        navigateReleaseAt = 0
      }
      if (vAbs <= 0.03 && hudState === "NAVIGATING") {
        if (navigateReleaseAt === 0) navigateReleaseAt = now + 280
        else if (now >= navigateReleaseAt) {
          transition(sectionIndex === 4 ? "CONTACT_ARMED" : "SECTION_LOCK")
        }
      }
      lastVelocityAbs = vAbs

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (io) io.disconnect()
    }
  }, [])

  return { depth, fps, uptime, sec, section }
}

// ── HAMBURGER ───────────────────────────────────────────────────────────
const HamburgerButton = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) => {
  const line1Ref = useRef<HTMLDivElement>(null)
  const line2Ref = useRef<HTMLDivElement>(null)
  const line3Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      gsap.to(line1Ref.current, { rotate: 45, y: 6, duration: 0.32, ease: ease.mechanical })
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
      <div ref={line1Ref} className="w-6 h-[2px] bg-white origin-center" />
      <div ref={line2Ref} className="w-6 h-[2px] bg-white origin-center" />
      <div ref={line3Ref} className="w-6 h-[2px] bg-white origin-center" />
    </button>
  )
}

// ── HEADER ──────────────────────────────────────────────────────────────
export const Header = () => {
  const containerRef = useRef<HTMLElement>(null)
  const lenis = useLenis()

  const { language, toggleLanguage } = useLanguage()

  const [time, setTime] = useState<string>("00:00:00")
  const [scrollProg, setScrollProg] = useState<number>(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  // Live telemetry — DOM refs, not state. Zero re-renders per frame.
  const telemetry = useTelemetry()

  useEffect(() => {
    const updateTime = () => setTime(new Date().toLocaleTimeString("cs-CZ", { hour12: false }))
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (lenis) return
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0)
        setScrollProg(Math.min(100, Math.max(0, Math.round((scrollY / docHeight) * 100))))
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lenis])

  useLenis((scroll) => {
    setScrollProg(Math.min(100, Math.max(0, Math.round(scroll.progress * 100))))
  })

  const handleScrollTo = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      e.preventDefault()
      const target = document.querySelector<HTMLElement>(targetId)
      if (target) {
        if (lenis) {
          lenis.scrollTo(target, {
            offset: 0,
            duration: 1.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          })
        } else {
          target.scrollIntoView({ behavior: "smooth" })
        }
      }
    },
    [lenis]
  )

  const handleMobileNavigate = useCallback(
    (targetId: string) => {
      const target = document.querySelector<HTMLElement>(targetId)
      if (target) {
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
      }
    },
    [lenis]
  )

  useGSAP(
    () => {
      gsap.fromTo(
        ".sys-element",
        { y: -20, opacity: 0, filter: "blur(6px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, stagger: 0.1, ease: ease.silk, delay: 0.2 }
      )

      const xOffsets = [360, 270, 110, 0]
      const items = gsap.utils.toArray(".nav-item")

      items.forEach((item: any, i) => {
        gsap.fromTo(
          item,
          { x: -xOffsets[i], y: -(i * 32) },
          {
            x: 0,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: document.body,
              start: "top top",
              end: "250px top",
              scrub: 1,
            },
          }
        )
      })
    },
    { scope: containerRef }
  )

  return (
    <>
      <header
        ref={containerRef}
        className="fixed top-0 left-0 w-full px-6 py-8 md:px-12 md:py-10 flex justify-between items-start z-[200] text-white pointer-events-none mix-blend-difference"
      >
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          <Link
            href="/"
            onClick={(e) => handleScrollTo(e, "body")}
            className="sys-element font-syne font-black text-2xl tracking-tighter uppercase leading-none hover:opacity-60 text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]"
            style={{ transition: `opacity 240ms ${ease.mechanical}` }}
          >
            TOMÁŠ K.
          </Link>
          <div className="sys-element flex flex-col font-mono text-[9px] tracking-[0.2em] text-white uppercase mt-1 opacity-80">
            <span>Next.js Architect</span>
            <span className="opacity-50">Creative Engineering / Nuclear Precision</span>
          </div>
        </div>

        <div className="flex flex-col items-end pointer-events-auto max-w-[65vw]">
          <div className="sys-element md:hidden">
            <HamburgerButton isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          </div>

          {/* ZMĚNĚNO: text-[10px] na text-sm */}
          <div className="sys-element hidden md:flex flex-wrap justify-end items-center gap-x-5 gap-y-2 font-mono text-sm tracking-[0.2em] text-white uppercase drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:opacity-60 cursor-pointer"
              style={{ transition: `opacity 240ms ${ease.mechanical}` }}
            >
              {/* ZMĚNĚNO: w-3 h-3 na w-4 h-4 */}
              <Globe className="w-4 h-4 animate-[spin_8s_linear_infinite]" />
              <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
            </button>
            <div className="flex items-center gap-1.5">
              {/* ZMĚNĚNO: w-1.5 h-1.5 na w-2 h-2 pro proporční vyvážení k textu */}
              <Circle className="w-2 h-2 fill-white animate-pulse" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              {/* ZMĚNĚNO: w-3 h-3 na w-4 h-4 */}
              <Activity className="w-4 h-4 text-white" />
              <span className="text-white">{scrollProg.toString().padStart(2, "0")}%</span>
            </div>
          </div>

          {/* Live page metadata — NOT a UI element. Tiny, monospace, 40%
              opacity. Sits under the primary HUD row as a second line of
              "system annotations" that confirms the live, instrumented
              nature of the page. No visual weight; pure typographic
              signal. Hidden on mobile where vertical space is precious. */}
          <div
            aria-hidden
            className="sys-element hidden md:flex justify-end items-center gap-x-4 mt-1.5 font-mono text-[8px] tracking-[0.22em] uppercase text-white/40 select-none pointer-events-none"
            style={{
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              letterSpacing: "0.22em",
            }}
          >
            <span className="flex items-center gap-1">
              <span className="opacity-60">SEC</span>
              <span ref={telemetry.sec} className="tabular-nums text-white/70">SECURE</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">SECTION</span>
              <span ref={telemetry.section} className="tabular-nums">00</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">SYS_DEPTH</span>
              <span ref={telemetry.depth} className="tabular-nums">0.0000</span>
              <span className="opacity-50">VP</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">FPS</span>
              <span ref={telemetry.fps} className="tabular-nums">60</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="opacity-60">UPTIME</span>
              <span ref={telemetry.uptime} className="tabular-nums">00:00:00</span>
            </span>
          </div>

          <nav className="sys-element relative hidden md:block w-[400px] h-[130px] mt-6">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item.label}
                href={item.id}
                onClick={(e) => handleScrollTo(e, item.id)}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx((prev) => (prev === i ? null : prev))}
                style={{ top: `${i * 32}px` }}
                className="nav-item absolute right-0 flex items-center gap-3 font-sans text-sm tracking-[0.1em] uppercase text-white py-1 cursor-pointer hover:text-white/90"
              >
                {/* ASCII scramble — fires on hover, resolves to label. */}
                <span className="inline-flex items-baseline">
                  <ScrambleText text={item.label} active={hoveredIdx === i} />
                </span>
                {/* Small monospace indicator that highlights the hovered row */}
                <span
                  className="font-mono text-[9px] tracking-[0.3em] text-white/30"
                  style={{
                    opacity: hoveredIdx === i ? 1 : 0.3,
                    transition: `opacity 280ms ${ease.mechanical}`,
                  }}
                >
                  {`0${i + 1}`}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Scroll progress bar was here — removed. We now rely on the HUD
          percentage in the top-right ("08%", "42%", etc.) which is clean,
          typographic, and doesn't feel like a 2019 template. */}

      <MobileMenuOverlay
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigate={handleMobileNavigate}
      />
    </>
  )
}
