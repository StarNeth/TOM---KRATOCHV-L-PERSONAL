"use client"

// components/navigation/header.tsx
// ─────────────────────────────────────────────────────────────────────────
// THE MEASUREMENT STRIP — Section 6A
//
// Not a navbar. An instrument. Reads system state and reports it. The user
// reads the instrument; the instrument does not look at the user.
//
//   Height: 48px desktop, 44px mobile. Fixed. Sacred.
//   Below 40px scroll: transparent. Above: --glass-heavy + backdrop-blur.
//   LEFT:   TK · 4.2.1
//   CENTER: ABOUT · WORK · CAPABILITIES · CONTACT (precision-line hover)
//   RIGHT:  refresh-rate · session-seconds · Dukovany NPP coords
//   MOBILE: TK + language toggle. Nothing else.
//
// Active state: --signal with a 2px bottom border. Driven by an
// IntersectionObserver on the four section anchors. Center cluster slides
// ±var(--coupling-nav) — the structural coupling whisper.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react"
import { useLenis } from "lenis/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { useDisplayRefresh } from "@/hooks/use-display-refresh"

const NAV_ITEMS = [
  { label: "ABOUT", id: "about" },
  { label: "WORK", id: "work" },
  { label: "CAPABILITIES", id: "capabilities" },
  { label: "CONTACT", id: "contact" },
] as const

const DUKOVANY = "N 49.083\u00B0  E 16.146\u00B0"

const HamburgerLine = ({ open, top }: { open: boolean; top: boolean }) => (
  <span
    aria-hidden
    style={{
      width: 18,
      height: 1,
      background: "var(--signal)",
      transformOrigin: "center",
      transition: "transform 220ms var(--ease-mechanical), opacity 160ms",
      transform: open
        ? top
          ? "translateY(2.5px) rotate(45deg)"
          : "translateY(-2.5px) rotate(-45deg)"
        : "none",
    }}
  />
)

export const Header = (): React.ReactElement => {
  const lenis = useLenis()
  const { language, toggleLanguage } = useLanguage()
  const refreshHz = useDisplayRefresh()

  const [scrolled, setScrolled] = useState(false)
  const [activeId, setActiveId] = useState<string>("")
  const [mobileOpen, setMobileOpen] = useState(false)

  const sessionRef = useRef<HTMLSpanElement>(null)
  const navWrapRef = useRef<HTMLDivElement>(null)
  const sessionStart = useRef<number>(performance.now())

  // Background tier — transparent below 40px scroll, glass-heavy above.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Active section observer.
  useEffect(() => {
    const els = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter(
      Boolean
    ) as HTMLElement[]
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1
        let bestRatio = 0
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio
            bestIdx = NAV_ITEMS.findIndex((n) => n.id === e.target.id)
          }
        }
        if (bestIdx >= 0 && bestRatio > 0.35) setActiveId(NAV_ITEMS[bestIdx].id)
      },
      { threshold: [0.35, 0.55, 0.75] }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  // Live session seconds — direct DOM write, no React state.
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last >= 100) {
        last = now
        const s = (performance.now() - sessionStart.current) / 1000
        if (sessionRef.current) sessionRef.current.textContent = s.toFixed(1)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id)
      if (!el) return
      if (lenis) {
        lenis.scrollTo(el, {
          offset: 0,
          duration: 1.4,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        })
      } else {
        el.scrollIntoView({ behavior: "smooth" })
      }
    },
    [lenis]
  )

  const onNav = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setMobileOpen(false)
    scrollTo(id)
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[100] flex items-center"
        style={{
          height: 48,
          background: scrolled ? "var(--glass-heavy)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid var(--rule)" : "1px solid transparent",
          transition:
            "background 280ms var(--ease-silk), backdrop-filter 280ms var(--ease-silk), border-color 280ms var(--ease-silk)",
        }}
      >
        <div className="w-full flex items-center justify-between px-4 md:px-6">
          {/* LEFT: TK · 4.2.1 */}
          <div className="flex items-center gap-3">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault()
                if (lenis) lenis.scrollTo(0, { duration: 1.2 })
                else window.scrollTo({ top: 0, behavior: "smooth" })
              }}
              className="font-sans font-black uppercase"
              style={{ color: "var(--signal)", fontSize: 14, letterSpacing: "0.02em" }}
              aria-label="Top"
            >
              TK
            </a>
            <span
              aria-hidden
              className="hidden md:block"
              style={{
                width: 1,
                height: 12,
                background: "var(--rule-active)",
              }}
            />
            <span
              className="hidden md:inline-block type-mono-micro-8"
              style={{ color: "var(--text-dim)" }}
              aria-hidden
            >
              4.2.1
            </span>
          </div>

          {/* CENTER: navigation — desktop only. Slides ±var(--coupling-nav). */}
          <nav
            ref={navWrapRef}
            aria-label="Primary"
            className="hidden md:flex items-center gap-8"
            style={{
              transform: "translateX(var(--coupling-nav, 0px))",
              transition: "transform 80ms linear",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const active = activeId === item.id
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => onNav(e, item.id)}
                  aria-current={active ? "page" : undefined}
                  className="precision-line"
                  data-active={active ? "true" : "false"}
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.40em",
                    textTransform: "uppercase",
                    color: active ? "var(--signal)" : "var(--text-dim)",
                    paddingBottom: 4,
                    borderBottom: active
                      ? "2px solid var(--signal)"
                      : "2px solid transparent",
                    transition: "color 240ms var(--ease-expo-out), border-color 240ms var(--ease-expo-out)",
                  }}
                >
                  {item.label}
                </a>
              )
            })}
          </nav>

          {/* RIGHT: telemetry — desktop only */}
          <div
            className="hidden md:flex items-center gap-5"
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 8,
              letterSpacing: "0.30em",
              textTransform: "uppercase",
              fontVariantNumeric: "tabular-nums",
              color: "var(--text-whisper)",
            }}
            aria-hidden
          >
            <span>{refreshHz} HZ</span>
            <span>
              <span ref={sessionRef}>0.0</span>
              <span style={{ marginLeft: 3 }}>S</span>
            </span>
            <span>{DUKOVANY}</span>
          </div>

          {/* MOBILE-ONLY: language toggle + hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label="Toggle language"
              className="type-mono-micro-8"
              style={{
                color: "var(--text-data)",
                background: "transparent",
                border: "none",
                padding: "6px 8px",
              }}
            >
              {language === "cs" ? "CZ" : "EN"}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="flex flex-col items-center justify-center gap-[5px]"
              style={{ width: 40, height: 40 }}
            >
              <HamburgerLine open={mobileOpen} top />
              <HamburgerLine open={mobileOpen} top={false} />
            </button>
          </div>

          {/* DESKTOP-ONLY: language toggle, far right next to telemetry */}
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="hidden md:inline-block precision-line ml-5"
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 8,
              letterSpacing: "0.40em",
              textTransform: "uppercase",
              color: "var(--text-data)",
              background: "transparent",
              border: "none",
              padding: "6px 0",
            }}
          >
            {language === "cs" ? "CZ / EN" : "EN / CZ"}
          </button>
        </div>
      </header>

      {/* MOBILE OVERLAY — minimal, instrument-grade, no choreography */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99,
          background: "var(--glass-heavy)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 320ms var(--ease-silk)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0 32px",
          gap: 28,
        }}
      >
        {NAV_ITEMS.map((item, i) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => onNav(e, item.id)}
            className="precision-line"
            data-active={activeId === item.id ? "true" : "false"}
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontWeight: 900,
              textTransform: "uppercase",
              fontSize: "clamp(2.5rem, 12vw, 4.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
              color: activeId === item.id ? "var(--signal)" : "var(--text-primary)",
              transform: mobileOpen ? "translateY(0)" : "translateY(20px)",
              opacity: mobileOpen ? 1 : 0,
              transition: `transform 520ms var(--ease-silk) ${i * 60}ms, opacity 520ms var(--ease-silk) ${i * 60}ms`,
            }}
          >
            <span
              aria-hidden
              style={{
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 400,
                fontSize: 10,
                letterSpacing: "0.4em",
                color: "var(--text-dim)",
                marginRight: 16,
                verticalAlign: "middle",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {item.label}
          </a>
        ))}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            right: 32,
            display: "flex",
            justifyContent: "space-between",
            color: "var(--text-dim)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 8,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
          }}
        >
          <span>SYSTEM ARCHITECT</span>
          <span>{DUKOVANY}</span>
        </div>
      </div>
    </>
  )
}
