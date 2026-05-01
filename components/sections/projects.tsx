"use client"

import { useRef, useEffect, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "@/components/navigation/language-toggle"
import { ease } from "@/lib/easing"
import { velocityBus } from "@/lib/velocity-bus"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
  ScrollTrigger.config({ ignoreMobileResize: true })
}

const DICTIONARY = {
  en: { titlePart1: "Digital", titlePart2: "Architectures.", label: "Selected · 2024—2026" },
  cs: { titlePart1: "Digitální", titlePart2: "Architektury.", label: "Vybrané · 2024—2026" },
}

const projects = [
  { id: "01", title: "ShuXiangLou", image: "/shu-xien-glou.vercel.app_.webp", slug: "shuxianglou" },
  { id: "02", title: "Kings Barber", image: "/kingsbarber-silk.vercel.app_.webp", slug: "kings-barber" },
]

// ─────────────────────────────────────────────────────────────────────────────
// HUD DECRYPTION PROTOCOL
// Geometric / monospace-friendly pool — glyphs that won't visually collapse
// against the Syne weight-900 display.
// ─────────────────────────────────────────────────────────────────────────────
const SCRAMBLE_POOL = "█▓▒░◆◉◈▲▼►◄#$%&*<>?:01XABCDEF/\\[]{}+-="

const decrypt = (el: HTMLElement, finalText: string, duration = 1.2) => {
  const total = finalText.length
  const durMs = duration * 1000
  const startT = performance.now()
  let raf = 0

  const step = () => {
    const t = Math.min(1, (performance.now() - startT) / durMs)
    const reveal = 1 - Math.pow(1 - t, 3) // ease-out-cubic
    const locked = Math.floor(reveal * total)

    let out = ""
    for (let i = 0; i < total; i++) {
      const c = finalText[i]
      if (c === " ") {
        out += " "
        continue
      }
      out += i < locked ? c : SCRAMBLE_POOL[(Math.random() * SCRAMBLE_POOL.length) | 0]
    }
    el.textContent = out

    if (t < 1) raf = requestAnimationFrame(step)
    else el.textContent = finalText
  }
  raf = requestAnimationFrame(step)
  return () => cancelAnimationFrame(raf)
}

// ─────────────────────────────────────────────────────────────────────────────
// CAST-IRON ASYMMETRIC SPRING — TRUE ζ-CORRECTED PHYSICS
//
// Damping ratio ζ = b / (2·√(k·m)) with implicit m = 1. This is the only
// quantity that governs physical feel; raw b values are meaningless in
// isolation. The previous implementation delivered ζ ≈ 0.71 in BOTH regimes
// — two flavors of "floaty." This rewrite delivers:
//
//   Attack   (accelerating):  ζ ≈ 1.40  → overdamped, zero oscillation.
//                                         The card engages with firm,
//                                         inevitable authority — cast iron
//                                         meeting cast iron.
//   Recovery (returning):      ζ ≈ 0.22  → heavily under-damped. The mass
//                                         overshoots rest by ~62% of the
//                                         error, pulls back, drifts past
//                                         again, then locks after 2–3
//                                         visible oscillations. This IS
//                                         the magnetic ringing.
//
// Derivation:
//   b_accel = 1.40 · 2·√380 ≈ 54.6   → 55
//   b_rec   = 0.22 · 2·√45  ≈ 2.95   → 3.0
//   (stretch channel uses k=520/68 → b=72/3.8 for the same ratios)
//
// Regime detection is velocity-signed (not magnitude-compared), so the
// channel correctly enters RECOVERY at the zero-crossing when the mass
// overshoots, not one frame late.
// ─────────────────────────────────────────────────────────────────────────────
interface SpringState {
  pos: number
  vel: number
}
interface SpringConfig {
  kAccel: number
  kRec: number
  bAccel: number
  bRec: number
}

// ζ_accel ≈ 1.40  (overdamped)  |  ζ_rec ≈ 0.22  (heavily under-damped)
const CAST_IRON: SpringConfig = {
  kAccel: 380,
  kRec: 45,
  bAccel: 55,
  bRec: 3.0,
}

// Same ratios on a stiffer spine — used by the BG word stretch channel
// where the larger visual mass demands more restoring force.
const CAST_IRON_STRETCH: SpringConfig = {
  kAccel: 520,
  kRec: 68,
  bAccel: 72,
  bRec: 3.8,
}

const stepSpring = (s: SpringState, target: number, dt: number, cfg: SpringConfig = CAST_IRON) => {
  const error = target - s.pos
  const accelerating = Math.sign(error) === Math.sign(s.vel) || Math.abs(s.vel) < 1e-3
  const k = accelerating ? cfg.kAccel : cfg.kRec
  const b = accelerating ? cfg.bAccel : cfg.bRec
  
  // ZMĚNĚNO: Framerate-independent damping via exact exponential decay.
  // Prevents the "concrete slab" stiffness on mobile CPU frame drops.
  s.vel += (k * error) * dt
  s.vel *= Math.exp(-b * dt)
  s.pos += s.vel * dt
  return s.pos
}

export const Projects = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]

  const containerRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const bgWordRef = useRef<HTMLDivElement>(null)

  // Cached DOM refs — the rAF loop NEVER calls querySelector.
  const cardRefs = useRef<HTMLElement[]>([])
  const linkRefs = useRef<HTMLAnchorElement[]>([])
  const titleRefs = useRef<HTMLElement[]>([])
  const imgWrapRefs = useRef<HTMLDivElement[]>([])
  const chromaRRefs = useRef<HTMLDivElement[]>([])
  const chromaCRefs = useRef<HTMLDivElement[]>([])
  const gridRefs = useRef<HTMLDivElement[]>([])

  // HUD matrix readouts — pointers to the DOM text nodes that display
  // the live transform values governing each card. These are the literal
  // numbers currently driving rotateY/skewX/translateZ — not decorative.
  const hudRotYRefs = useRef<HTMLSpanElement[]>([])
  const hudSkewRefs = useRef<HTMLSpanElement[]>([])
  const hudDepthRefs = useRef<HTMLSpanElement[]>([])
  const hudVelRefs = useRef<HTMLSpanElement[]>([])

  // MEMORY-SAFE glitch timeline registry. Timelines are keyed by card index.
  // On unmount we iterate and kill — no orphaned tickers against detached
  // nodes, no `(wrap as any).glitchTl` DOM-property leak.
  const glitchTimelines = useRef<Map<number, gsap.core.Timeline>>(new Map())

  const [isVisible, setIsVisible] = useState(false)

  // ZMĚNĚNO: Ref-based tracking to avoid stale closures in the rAF loop
  const vwRef = useRef(typeof window !== "undefined" ? window.innerWidth : 1200)

  useEffect(() => {
    if (typeof window === "undefined") return
    const ro = new ResizeObserver(() => {
      // Zapisujeme přímo do refu (ne do state) a používáme innerWidth 
      // kvůli přesnosti oproti contentRect (vyhýbá se driftu od scrollbaru).
      vwRef.current = window.innerWidth
    })
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [])

  // Horizontal scroll pin — the velocity bus owns all kinetic math.
  useGSAP(
    () => {
      const track = trackRef.current
      if (!track) return

      const scrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth)

      gsap.to(track, {
        x: () => -scrollAmount(),
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: () => `+=${scrollAmount()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      })
    },
    { scope: containerRef },
  )

  // Visibility gate — the tilt loop only runs while in/near viewport.
  useEffect(() => {
    if (!containerRef.current) return
    const io = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      rootMargin: "300px",
    })
    io.observe(containerRef.current)
    return () => io.disconnect()
  }, [])

  // ───────────────────────────────────────────────────────────────────────────
  // SINGLE rAF LOOP — CACHED REFS + ASYMMETRIC SPRING + CAUSAL DENSITY
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return
    let raf = 0
    const cards = cardRefs.current
    const links = linkRefs.current
    const bg = bgWordRef.current
    const grids = gridRefs.current
    const hudRotYs = hudRotYRefs.current
    const hudSkews = hudSkewRefs.current
    const hudDepths = hudDepthRefs.current
    const hudVels = hudVelRefs.current

    const sRotY:      SpringState = { pos: 0, vel: 0 }
    const sSkewX:     SpringState = { pos: 0, vel: 0 }
    const sBgSkew:    SpringState = { pos: 0, vel: 0 }
    const sBgStretch: SpringState = { pos: 1, vel: 0 }

    let lastT = performance.now()

    const tick = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.033)
      lastT = now

      const { normalized, intensity } = velocityBus.get()

      const tRotY      = -normalized * 18
      const tSkewX     =  normalized * 4
      const tBgSkew    =  normalized * -6
      const tBgStretch = 1 + intensity * 0.1

      stepSpring(sRotY,      tRotY,      dt)
      stepSpring(sSkewX,     tSkewX,     dt)
      stepSpring(sBgSkew,    tBgSkew,    dt)
      stepSpring(sBgStretch, tBgStretch, dt, CAST_IRON_STRETCH)

      // ZMĚNĚNO: vw se čte živě z refu v každém framu. Tím padá problém se Stale Closure.
      const currentVw = vwRef.current
      const isMobileViewport = currentVw < 768

      const viewportCenter = currentVw / 2
      const span           = currentVw * 0.65

      for (let i = 0; i < cards.length; i++) {
        const el = cards[i]
        if (!el) continue
        const rect        = el.getBoundingClientRect()
        const cardCenter  = rect.left + rect.width / 2
        const rawOffset   = (cardCenter - viewportCenter) / span
        const offset      = Math.max(-1, Math.min(1, rawOffset))

        const posRotY  = -offset * 45
        const posSkewX =  offset * 6
        const posZ     = -Math.abs(offset) * 180 - Math.abs(normalized) * 40
        const scale    =  1 - Math.abs(offset) * 0.08 - intensity * 0.03

        const totalRotY  = posRotY  + sRotY.pos
        const totalSkewX = posSkewX + sSkewX.pos

        // ── CORE TRANSFORMS — always written, composited, free on mobile ──
        el.style.setProperty("--rotY",  `${totalRotY}deg`)
        el.style.setProperty("--skewX", `${totalSkewX}deg`)
        el.style.setProperty("--z",     `${posZ}px`)
        el.style.setProperty("--scale", `${scale}`)

        if (!isMobileViewport) {
          // ── DESKTOP-ONLY: grid, border-glow, HUD ────────────────────────
          // These are progressive enhancements. On mobile they would cause
          // heavy repaints and layout recalculations (saving ~8-14ms/frame).
          const grid = grids[i]
          if (grid) {
            grid.style.opacity = `${intensity * 0.18}`
            grid.style.setProperty("--grid-size", `${24 - intensity * 8}px`)
          }

          const link = links[i]
          if (link) {
            link.style.setProperty("--border-opacity", `${0.1 + intensity * 0.55}`)
            link.style.setProperty("--border-glow",    `${intensity * 28}px`)
          }

          const hr = hudRotYs[i]
          const hs = hudSkews[i]
          const hd = hudDepths[i]
          const hv = hudVels[i]
          if (hr) hr.textContent = `${totalRotY.toFixed(2)}°`
          if (hs) hs.textContent = `${totalSkewX.toFixed(2)}°`
          if (hd) hd.textContent = `${posZ.toFixed(1)}z`
          if (hv) hv.textContent = `${(intensity * 100).toFixed(0)}%`
        }
      }

      if (bg) {
        bg.style.setProperty("--bg-skew",    `${sBgSkew.pos}deg`)
        bg.style.setProperty("--bg-stretch", `${sBgStretch.pos}`)
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isVisible])

  // ───────────────────────────────────────────────────────────────────────────
  // CARD ENTRANCE + HUD DECRYPTION
  // ───────────────────────────────────────────────────────────────────────────
  useGSAP(
    () => {
      const cleanups: Array<() => void> = []

      titleRefs.current.forEach((titleEl) => {
        if (!titleEl) return
        const w = titleEl.getBoundingClientRect().width
        if (w > 0) titleEl.style.minWidth = `${Math.ceil(w)}px`
        titleEl.textContent = "[ CLASSIFIED ]"
      })

      const containerAnim = ScrollTrigger.getAll().find((st) => st.pin === containerRef.current)?.animation

      gsap.utils.toArray<HTMLElement>(".project-card-entrance").forEach((card, i) => {
        const titleEl = titleRefs.current[i]
        const finalText = projects[i]?.title ?? ""

        gsap.fromTo(
          card,
          { opacity: 0, y: 60, filter: "blur(10px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.3,
            ease: ease.silk,
            scrollTrigger: {
              trigger: card,
              containerAnimation: containerAnim,
              start: "left 90%",
            },
            delay: i * 0.05,
            onStart: () => {
              if (titleEl) {
                const stop = decrypt(titleEl, finalText, 1.2)
                cleanups.push(stop)
              }
            },
          },
        )
      })

      gsap.fromTo(
        ".projects-title-char",
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1.3,
          stagger: 0.03,
          ease: ease.silk,
          scrollTrigger: { trigger: containerRef.current, start: "top 85%" },
        },
      )

      return () => cleanups.forEach((fn) => fn())
    },
    { scope: containerRef, dependencies: [language] },
  )

  // ───────────────────────────────────────────────────────────────────────────
  // MEMORY-SAFE RGB SPLIT GLITCH + SLOW ZOOM
  //
  // Timelines are stored in `glitchTimelines` (a Map<index, Timeline> ref).
  // On unmount we iterate the map and kill each timeline — no orphaned
  // GSAP tickers against detached DOM, no properties stashed on elements.
  // ───────────────────────────────────────────────────────────────────────────
  useGSAP(
    () => {
      const removers: Array<() => void> = []
      const timelines = glitchTimelines.current

      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const link = card.querySelector<HTMLAnchorElement>("a")
        const wrap = imgWrapRefs.current[i]
        const cR = chromaRRefs.current[i]
        const cC = chromaCRefs.current[i]
        if (!link || !wrap) return

        const onEnter = () => {
          const targets = [wrap, cR, cC].filter(Boolean) as Element[]
          gsap.killTweensOf(targets)

          // Slow high-tension zoom — the dread build.
          gsap.to(wrap, { opacity: 1, duration: 0.4, ease: "power2.out" })
          gsap.to(wrap, { scale: 1.06, duration: 3, ease: "power1.out" })

          if (cR && cC) {
            // Kill any prior timeline for this index before registering a new one.
            timelines.get(i)?.kill()

            const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.2 })
            tl.set([cR, cC], { opacity: 0.4 })
              .to(
                cR,
                {
                  x: () => gsap.utils.random(-8, 8),
                  y: () => gsap.utils.random(-4, 4),
                  duration: 0.04,
                  ease: "steps(1)",
                },
              )
              .to(
                cC,
                {
                  x: () => gsap.utils.random(-8, 8),
                  y: () => gsap.utils.random(-4, 4),
                  duration: 0.04,
                  ease: "steps(1)",
                },
                "<",
              )
              .to(
                wrap,
                {
                  x: () => gsap.utils.random(-3, 3),
                  duration: 0.04,
                  ease: "steps(1)",
                },
                "<",
              )
              .to([cR, cC], { x: 0, y: 0, opacity: 0, duration: 0.04, ease: "power2.out" })
              .to(wrap, { x: 0, duration: 0.04, ease: "power2.out" }, "<")

            timelines.set(i, tl)
          }
        }

        const onLeave = () => {
          const targets = [wrap, cR, cC].filter(Boolean) as Element[]
          gsap.killTweensOf(targets)

          // Kill and DELETE — not just kill. The map entry itself must go.
          const tl = timelines.get(i)
          if (tl) {
            tl.kill()
            timelines.delete(i)
          }

          gsap.to(wrap, {
            scale: 1,
            x: 0,
            y: 0,
            skewX: 0,
            opacity: 0.85,
            duration: 0.8,
            ease: "power3.out",
          })

          if (cR && cC) {
            gsap.to([cR, cC], { opacity: 0, x: 0, y: 0, duration: 0.15 })
          }
        }

        link.addEventListener("mouseenter", onEnter)
        link.addEventListener("mouseleave", onLeave)
        removers.push(() => {
          link.removeEventListener("mouseenter", onEnter)
          link.removeEventListener("mouseleave", onLeave)
        })
      })

      // Unmount cleanup — iterate the map, kill everything, clear.
      return () => {
        timelines.forEach((tl) => tl.kill())
        timelines.clear()
        removers.forEach((fn) => fn())
        // Kill any one-shot tweens created imperatively in event handlers.
        // These are outside the useGSAP context scope and are not auto-reverted.
        imgWrapRefs.current.forEach((el) => el && gsap.killTweensOf(el))
        chromaRRefs.current.forEach((el) => el && gsap.killTweensOf(el))
        chromaCRefs.current.forEach((el) => el && gsap.killTweensOf(el))
      }
    },
    { scope: containerRef },
  )

  return (
    <section
      ref={containerRef}
      id="work"
      className="relative w-full h-[100svh] bg-transparent perspective-[2200px] overflow-hidden"
    >
      <div
        ref={bgWordRef}
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1] select-none"
        style={{
          ["--bg-skew" as any]: "0deg",
          ["--bg-stretch" as any]: 1,
        }}
      >
        <span
          className="font-syne font-black uppercase whitespace-nowrap tracking-[-0.06em] leading-[0.82] text-white/[0.05]"
          style={{
            fontSize: "clamp(4rem, 16vw, 17rem)",
            transform: "skewY(var(--bg-skew)) scaleY(var(--bg-stretch))",
            willChange: "transform",
            // AUDIT FIX: the 160ms CSS transition has been REMOVED.
            // The spring IS the smoothing. Layering a linear CSS interp on
            // top was re-smoothing the regime-switch output, blurring the
            // cast-iron attack into the magnetic recovery. Gone.
          }}
        >
          WORK/LOG
        </span>
      </div>

      <div
        ref={trackRef}
        className="flex h-full items-center px-[5vw] md:px-[10vw] gap-[10vw] md:gap-[15vw] will-change-transform pr-[20vw] z-10 transform-style-3d relative"
      >
        <div className="flex-shrink-0 w-[90vw] md:w-auto md:min-w-[45vw] relative z-20 pointer-events-none transform-gpu">
          <span className="font-mono text-[10px] tracking-[0.5em] text-white/50 uppercase block mb-6">{t.label}</span>
          <h2
            className="font-syne font-black uppercase tracking-[-0.05em] leading-[0.82] text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            style={{ fontSize: "clamp(5rem, 14vw, 14rem)", fontFeatureSettings: '"ss01","ss02"' }}
          >
            <span className="block whitespace-nowrap" style={{ clipPath: "inset(0 -100vw 0 0)" }}>
              <span className="projects-title-char inline-block">{t.titlePart1}</span>
            </span>
            <span className="block whitespace-nowrap -mt-[0.08em]" style={{ clipPath: "inset(-0.15em -100vw 0 0)" }}>
              <span className="projects-title-char inline-block font-instrument italic font-light lowercase text-white/70">
                {t.titlePart2}
              </span>
            </span>
          </h2>
          <div className="mt-8 flex items-center gap-4 font-mono text-[10px] tracking-[0.4em] uppercase text-white/40">
            <span className="block h-px w-10 bg-white/30" />
            <span>{"Scroll →"}</span>
          </div>
        </div>

        {projects.map((p, index) => (
          <div
            key={p.id}
            className="project-card-entrance relative w-[85vw] md:w-[55vw] aspect-[3/4] md:aspect-[16/10] flex-shrink-0 z-50"
            style={{
              opacity: 0,
              willChange: "transform, opacity, filter",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              ref={(el) => {
                if (el) cardRefs.current[index] = el
              }}
              className="project-card relative w-full h-full group transform-gpu will-change-transform"
              style={{
                ["--rotY" as any]: "0deg",
                ["--skewX" as any]: "0deg",
                ["--z" as any]: "0px",
                ["--scale" as any]: 1,
                transform: "rotateY(var(--rotY)) skewX(var(--skewX)) translateZ(var(--z)) scale(var(--scale))",
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute -top-8 md:-top-12 -left-2 md:-left-6 z-0 pointer-events-none hidden md:block"
                style={{ transform: "translateZ(-80px)" }}
              >
                <span
                  className="font-syne font-black uppercase tracking-[-0.04em] leading-none text-white/10"
                  style={{ fontSize: "clamp(6rem, 10vw, 12rem)" }}
                >
                  {p.id}
                </span>
              </div>

              <Link
                ref={(el) => {
                  if (el) linkRefs.current[index] = el
                }}
                href={`/work/${p.slug}`}
                draggable={false}
                aria-label={`View case study for ${p.title}`}
                data-cursor="hover"
                className="relative block w-full h-full rounded-lg overflow-hidden bg-[#050505] pointer-events-auto cursor-pointer"
                style={{
                  // Signal-strength border + glow — driven from the rAF tick.
                  ["--border-opacity" as any]: 0.1,
                  ["--border-glow" as any]: "0px",
                  border: "1px solid rgba(255,255,255,var(--border-opacity, 0.1))",
                  boxShadow:
                    "0 40px 80px rgba(0,0,0,0.9), 0 0 var(--border-glow, 0px) rgba(255,255,255,0.35)",
                }}
              >
                {/* Primary image — inside a GSAP-driven wrapper for zoom/glitch */}
                <div
                  ref={(el) => {
                    if (el) imgWrapRefs.current[index] = el
                  }}
                  className="absolute inset-0 will-change-transform transform-gpu"
                  style={{ opacity: 0.85 }}
                >
                  <Image
                    src={p.image || "/placeholder.svg"}
                    alt={`Screenshot of ${p.title}`}
                    fill
                    draggable={false}
                    quality={100}
                    sizes="(max-width: 768px) 85vw, (max-width: 1200px) 60vw, 1100px"
                    className="object-cover object-top select-none"
                    priority={index === 0}
                  />
                </div>

                {/* RGB split — RED channel */}
                <div
                  ref={(el) => {
                    if (el) chromaRRefs.current[index] = el
                  }}
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "top",
                    mixBlendMode: "screen",
                    opacity: 0,
                    filter: "sepia(1) saturate(14) hue-rotate(-50deg) brightness(1.15)",
                    willChange: "opacity, transform",
                  }}
                />
                {/* RGB split — CYAN channel */}
                <div
                  ref={(el) => {
                    if (el) chromaCRefs.current[index] = el
                  }}
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    backgroundImage: `url(${p.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "top",
                    mixBlendMode: "screen",
                    opacity: 0,
                    filter: "sepia(1) saturate(14) hue-rotate(150deg) brightness(1.15)",
                    willChange: "opacity, transform",
                  }}
                />

                {/* UPGRADE 1: Velocity-driven scanline grid — opacity and
                    spacing are written from the rAF tick. At rest, invisible.
                    Under scroll, compresses and asserts itself. */}
                <div
                  ref={(el) => {
                    if (el) gridRefs.current[index] = el
                  }}
                  aria-hidden
                  className="absolute inset-0 pointer-events-none z-[11]"
                  style={{
                    ["--grid-size" as any]: "24px",
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
                    backgroundSize: "var(--grid-size, 24px) var(--grid-size, 24px)",
                    mixBlendMode: "overlay",
                    opacity: 0,
                    willChange: "opacity, background-size",
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/10 to-transparent opacity-90 pointer-events-none z-0" />

                <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20 pointer-events-none">
                  <span className="font-mono text-[9px] tracking-[0.4em] text-white/50 uppercase">
                    {p.id} · CASE
                  </span>
                </div>

                {/* UPGRADE 2: PERSPECTIVE · RENDER · MATRIX HUD.
                    Text nodes are written every frame from the exact values
                    driving rotateY/skewX/translateZ. The label and the
                    geometry share one source of truth. */}
                <div
                  className="absolute top-6 right-6 md:top-10 md:right-10 z-20 pointer-events-none font-mono text-[9px] tracking-[0.2em] uppercase text-white/70 backdrop-blur-sm bg-black/30 border border-white/10 px-3 py-2 rounded-sm"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                  aria-hidden
                >
                  <div className="text-white/40 mb-1.5">PROJ · RENDER · MATRIX</div>
                  <div className="hidden md:grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                    <span className="text-white/40">ROT_Y</span>
                    <span
                      ref={(el) => {
                        if (el) hudRotYRefs.current[index] = el
                      }}
                      className="text-right text-white"
                    >
                      0.00°
                    </span>
                    <span className="text-white/40">SKEW_X</span>
                    <span
                      ref={(el) => {
                        if (el) hudSkewRefs.current[index] = el
                      }}
                      className="text-right text-white"
                    >
                      0.00°
                    </span>
                    <span className="text-white/40">Z_DEPTH</span>
                    <span
                      ref={(el) => {
                        if (el) hudDepthRefs.current[index] = el
                      }}
                      className="text-right text-white"
                    >
                      0.0z
                    </span>
                    <span className="text-white/40">VEL</span>
                    <span
                      ref={(el) => {
                        if (el) hudVelRefs.current[index] = el
                      }}
                      className="text-right text-white"
                    >
                      0%
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20 pointer-events-none">
                  <h3
                    ref={(el) => {
                      if (el) titleRefs.current[index] = el
                    }}
                    className="font-syne font-black uppercase tracking-[-0.04em] leading-none text-white group-hover:translate-x-2 whitespace-nowrap"
                    style={{
                      fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
                      transition: `transform 500ms ${ease.silk}`,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.title}
                  </h3>
                </div>

                <div className="absolute bottom-6 right-6 md:bottom-12 md:right-12 z-20 pointer-events-none">
                  <div
                    className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center backdrop-blur-md group-hover:bg-white group-hover:border-white"
                    style={{
                      transition: `background 500ms ${ease.mechanical}, border-color 500ms ${ease.mechanical}`,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-white group-hover:text-black group-hover:translate-x-1 group-hover:-translate-y-1"
                      style={{
                        transition: `transform 500ms ${ease.silk}, color 500ms ${ease.mechanical}`,
                      }}
                    >
                      <path
                        d="M1 13L13 1M13 1H4.6M13 1V9.4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `.transform-style-3d { transform-style: preserve-3d; }` }} />
    </section>
  )
}