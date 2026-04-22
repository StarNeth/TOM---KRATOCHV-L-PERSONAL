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
          className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-full font-mono text-[10px] tracking-widest uppercase text-white hover:bg-white/10"
          style={{ transition: `background 240ms ${ease.mechanical}` }}
        >
          <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
          <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
        </button>

        <div className="flex flex-col items-center gap-2 text-white/40">
          <span className="font-mono text-[9px] tracking-[0.3em] uppercase">System Architect</span>
          <div className="w-8 h-[1px] bg-white/20" />
          <span className="font-mono text-[8px] tracking-[0.2em]">Czech Republic</span>
        </div>
      </div>
    </div>
  )
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

          <div className="sys-element hidden md:flex flex-wrap justify-end items-center gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.2em] text-white uppercase drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 hover:opacity-60 cursor-pointer"
              style={{ transition: `opacity 240ms ${ease.mechanical}` }}
            >
              <Globe className="w-3 h-3 animate-[spin_8s_linear_infinite]" />
              <span>{language === "cs" ? "CZECH" : "ENGLISH"}</span>
            </button>
            <div className="flex items-center gap-1.5">
              <Circle className="w-1.5 h-1.5 fill-white animate-pulse" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Activity className="w-3 h-3 text-white" />
              <span className="text-white">{scrollProg.toString().padStart(2, "0")}%</span>
            </div>
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
