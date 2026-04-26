// components/sections/capabilities.tsx
"use client"

import { useRef, useState, useEffect } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useLanguage } from "@/components/navigation/language-toggle"
import { velocityBus } from "@/lib/velocity-bus"
import { ease } from "@/lib/easing"

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger)

// ────────────────────────────────────────────────────────────────────────
// COPY
// ────────────────────────────────────────────────────────────────────────
const DICTIONARY = {
  en: {
    sectionLabel: "03 // ARCHITECTURE",
    sectionId: "SYSTEM CAPABILITIES",
    titleA: "Architecture",
    titleB: "in motion.",
    eyebrow: "Stack manifest",
    legend: "Click any node to inject a system pulse.",
  },
  cs: {
    sectionLabel: "03 // ARCHITEKTURA",
    sectionId: "SCHOPNOSTI SYSTÉMU",
    titleA: "Architektura",
    titleB: "v pohybu.",
    eyebrow: "Manifest stacku",
    legend: "Kliknutí na uzel vyvolá systémový impuls.",
  },
}

// ────────────────────────────────────────────────────────────────────────
// NODE MANIFEST
//
// All nodes are RECTANGULAR with bracket-corner detail. The exception:
// `WEBGL` runs as a special "scope node" — same rectangular outer chrome
// but the body hosts a tiny binary oscilloscope. Every other node is a
// uniform spec card so the WEBGL one reads as a deliberate variant.
// `kind` controls visual emphasis: solid (filled), outline, accent (cobalt
// fill), scope (oscilloscope variant).
// ────────────────────────────────────────────────────────────────────────
type NodeKind = "solid" | "outline" | "accent" | "scope"

interface NodeSpec {
  id: string
  label: string
  kind: NodeKind
  meta: string
  desk: { x: number; y: number; w: number }
}

const NODES: NodeSpec[] = [
  { id: "ARCH-01", label: "System architecture", kind: "solid",   meta: "core",     desk: { x: 6,  y: 14, w: 22 } },
  { id: "FE-02",   label: "Next.js 16 · App",     kind: "outline", meta: "runtime",  desk: { x: 38, y: 8,  w: 18 } },
  { id: "RX-03",   label: "React 19",             kind: "accent",  meta: "view",     desk: { x: 65, y: 18, w: 14 } },
  { id: "GL-04",   label: "WEBGL",                kind: "scope",   meta: "render",   desk: { x: 12, y: 46, w: 18 } },
  { id: "UX-05",   label: "UI · UX engineering",  kind: "outline", meta: "interface", desk: { x: 60, y: 52, w: 22 } },
  { id: "PERF-06", label: "Performance budget",   kind: "solid",   meta: "budget",   desk: { x: 8,  y: 78, w: 19 } },
  { id: "3D-07",   label: "3D experiences",       kind: "outline", meta: "gpu",      desk: { x: 38, y: 84, w: 18 } },
  { id: "GS-08",   label: "GSAP · timeline",      kind: "accent",  meta: "motion",   desk: { x: 65, y: 80, w: 16 } },
]

// ────────────────────────────────────────────────────────────────────────
// BINARY OSCILLOSCOPE
//
// Tiny canvas that draws a scrolling stream of 1s and 0s arranged in a
// waveform. Each glyph's vertical position is biased by perlin-ish hash
// so the line reads as DATA, not as a pretty sine wave. Frame budget is
// ~0.8ms — we're drawing 22×3 monospace cells, no complex paths.
//
// Nudges harder when scroll velocity rises. That's the whole point: the
// node SHOWS the system reacting to you.
// ────────────────────────────────────────────────────────────────────────
const Oscilloscope = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const fit = () => {
      const r = cv.getBoundingClientRect()
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(cv)

    let raf = 0
    let t = 0
    // 16-cell-wide stream (each cell ~ a glyph).
    const COLS = 22
    const ROWS = 3

    const draw = () => {
      t += 1
      const w = cv.width
      const h = cv.height
      ctx.clearRect(0, 0, w, h)
      const cellW = w / COLS
      const cellH = h / ROWS
      const { intensity } = velocityBus.get()

      ctx.fillStyle = "rgba(245,243,235,0.85)"
      ctx.font = `${Math.round(cellH * 0.74)}px ui-monospace, JetBrains Mono, monospace`
      ctx.textBaseline = "middle"
      ctx.textAlign = "center"

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          // PRBS-ish: use a deterministic but visually random toggle.
          const seed = (c * 37 + r * 11 + t * 0.6 + intensity * 22) | 0
          const bit = (seed * 1103515245 + 12345) & 1
          const drift = ((seed * 9301 + 49297) % 233280) / 233280 // 0..1
          const y = (r + 0.5) * cellH + (drift - 0.5) * cellH * 0.3 * (0.4 + intensity)
          ctx.globalAlpha = bit ? 0.95 : 0.28
          ctx.fillStyle = bit ? "rgba(123,176,255,0.95)" : "rgba(245,243,235,0.7)"
          ctx.fillText(bit ? "1" : "0", (c + 0.5) * cellW, y)
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    if (active) raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [active])
  return <canvas ref={canvasRef} className="block w-full h-full" aria-hidden />
}

// ────────────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────────────
export const Capabilities = () => {
  const { language } = useLanguage()
  const t = DICTIONARY[language]
  const sectionRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)
  const nodesRef = useRef<HTMLDivElement[]>([])
  const magneticRefs = useRef<HTMLDivElement[]>([])

  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    setIsMounted(true)
    setIsMobile(window.innerWidth < 768)
    const onR = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", onR)
    return () => window.removeEventListener("resize", onR)
  }, [])

  // ── TITLE SCRAMBLE ──────────────────────────────────────────────────
  // Same per-char warmup model used elsewhere — left untouched because it
  // works and matches the system tone.
  useEffect(() => {
    if (!isMounted) return
    const el = titleTextRef.current
    if (!el) return
    const target = t.titleA
    const CHARS = "0123456789ABCDEF!@#$%&*<>/?^~+=-|[]{}"
    const PER_CHAR_MS = 18
    const WARMUP_MS = 120
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (!start) start = now
      const elapsed = now - start
      let out = ""
      for (let i = 0; i < target.length; i++) {
        if (elapsed >= WARMUP_MS + i * PER_CHAR_MS) out += target[i]
        else if (target[i] === " ") out += " "
        else out += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      el.textContent = out
      if (elapsed < WARMUP_MS + target.length * PER_CHAR_MS + 40) raf = requestAnimationFrame(tick)
      else el.textContent = target
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          raf = requestAnimationFrame(tick)
          obs.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => {
      cancelAnimationFrame(raf)
      obs.disconnect()
      if (el) el.textContent = target
    }
  }, [isMounted, t.titleA])

  // ── ENTRANCE ────────────────────────────────────────────────────────
  useGSAP(
    () => {
      if (!isMounted) return

      // Title block — same blur-up reveal pattern as Hero. Keeps the page
      // tonally coherent.
      gsap.fromTo(
        ".cap-title-line",
        { opacity: 0, y: 28, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.2,
          stagger: 0.08,
          ease: ease.silk,
          scrollTrigger: { trigger: sectionRef.current, start: "top 82%" },
        },
      )

      // Node entrance — top-down stagger, mechanical ease (commits in
      // sequence, like a control system booting checks).
      gsap.fromTo(
        ".cap-node",
        { opacity: 0, y: 18, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.05,
          ease: ease.mechanical,
          scrollTrigger: { trigger: containerRef.current, start: "top 78%" },
        },
      )

      // Nodes drift gently in place — desktop only. The drift is small
      // (±5px on mobile-sized values, ±18 on desktop) and runs forever
      // with yoyo so the panel never feels static.
      const timeout = setTimeout(() => {
        nodesRef.current.forEach((node, i) => {
          if (!node) return
          gsap.to(node, {
            y: `+=${isMobile ? Math.random() * 8 - 4 : Math.random() * 18 - 9}`,
            x: `+=${isMobile ? Math.random() * 6 - 3 : Math.random() * 14 - 7}`,
            duration: Math.random() * 3 + 4.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * -0.7,
          })
        })
      }, 200)
      return () => clearTimeout(timeout)
    },
    { scope: sectionRef, dependencies: [isMounted, isMobile, language] },
  )

  // ── VELOCITY-DRIVEN MICRO-SKEW ──────────────────────────────────────
  // Desktop only. Same instrumentation pattern as Hero/About — the page
  // breathes in unison with scroll velocity.
  useEffect(() => {
    if (!isMounted || isMobile) return
    let raf = 0
    const tick = () => {
      const { normalized, intensity } = velocityBus.get()
      const stretch = 1 + intensity * 0.06
      const skew = normalized * 1.5
      for (const node of nodesRef.current) {
        if (!node) continue
        node.style.setProperty("--cap-stretch", `${stretch}`)
        node.style.setProperty("--cap-skew", `${skew}deg`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isMounted, isMobile])

  // ── INTERACTION (magnetic + click pulse) ────────────────────────────
  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (isMobile) return
    const el = nodesRef.current[index]
    const mag = magneticRefs.current[index]
    if (!el || !mag) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) * 0.32
    const y = (e.clientY - rect.top - rect.height / 2) * 0.32
    gsap.to(mag, {
      x,
      y,
      scale: 1.04,
      duration: 0.5,
      ease: ease.silk,
      overwrite: "auto",
    })
  }
  const handleMouseLeave = (index: number) => {
    const mag = magneticRefs.current[index]
    if (mag)
      gsap.to(mag, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.7,
        ease: ease.ballistic,
        overwrite: "auto",
      })
  }
  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    const mag = magneticRefs.current[index]
    // Inviolable: webgl-shoot click-pulse path stays exactly as before.
    window.dispatchEvent(new CustomEvent("webgl-shoot", { detail: { x: e.clientX, y: e.clientY } }))
    if (mag) {
      gsap.fromTo(mag, { scale: 0.86 }, { scale: 1, duration: 0.55, ease: ease.ballistic, overwrite: "auto" })
    }
  }

  if (!isMounted) return <section className="min-h-[100svh] bg-transparent" />

  return (
    <section
      ref={sectionRef}
      id="capabilities"
      data-section-index="3"
      className="relative isolate w-full min-h-[100svh] z-10 flex flex-col overflow-hidden bg-transparent"
    >
      {/* HEADER STRIP — matches About/Hero rhythm */}
      <div className="relative z-20 px-6 md:px-12 lg:px-24 pt-20 md:pt-28">
        <div className="flex items-end justify-between mb-10 md:mb-16">
          <div className="flex flex-col gap-1">
            <span className="text-hud text-[var(--color-dim-strong)]">{t.sectionLabel}</span>
            <span className="text-hud-sm text-[var(--color-dim)]">{t.sectionId}</span>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <span className="text-hud-sm text-[var(--color-dim)]">{t.eyebrow}</span>
            <span className="text-hud text-[var(--color-dim-strong)]">NODES · {NODES.length}</span>
          </div>
        </div>

        <h2
          className="font-display font-black uppercase tracking-[-0.045em] leading-[0.92] mb-2"
          style={{ fontSize: "clamp(2.4rem, 8vw, 8rem)" }}
        >
          <span className="cap-title-line block">
            <span ref={titleTextRef} className="inline-block tabular-nums">
              {t.titleA}
            </span>
          </span>
          <span className="cap-title-line block font-italic font-light italic lowercase tracking-normal text-[var(--color-bone)]/65">
            {t.titleB}
          </span>
        </h2>

        <div className="flex items-center gap-3 mt-6 text-[10px] tracking-[0.2em] uppercase font-mono text-[var(--color-dim)]">
          <span aria-hidden className="w-6 h-px bg-[var(--color-cobalt)]/60" />
          {t.legend}
        </div>
      </div>

      {/* NODE FIELD ────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 mt-12 md:mt-0 md:absolute md:inset-0 md:pt-72 md:px-12 lg:px-24 pb-20 md:pb-32 z-10 pointer-events-none flex flex-wrap content-center justify-center gap-3 px-4 max-w-[1700px] mx-auto md:flex-nowrap md:block"
      >
        {NODES.map((node, i) => {
          const isScope = node.kind === "scope"
          // BASE OUTER RECT
          let baseClasses =
            "relative flex items-center gap-3 px-4 py-3 md:px-5 md:py-4 will-change-transform select-none transition-shadow"
          let textClasses = "font-display font-black tracking-[0.06em] uppercase whitespace-nowrap "
          let metaColor = "text-[var(--color-dim)]"
          let bgStyle: React.CSSProperties = {}

          if (node.kind === "solid") {
            baseClasses += " bg-[var(--color-bone)] text-[var(--color-obsidian)] shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_30px_rgba(245,243,235,0.18)]"
            textClasses += "text-[10px] md:text-[11px]"
            metaColor = "text-[var(--color-obsidian)]/55"
          } else if (node.kind === "outline") {
            baseClasses += " bg-transparent border border-[var(--color-graphite)] text-[var(--color-bone)] hover:border-[var(--color-bone)] hover:bg-[var(--color-bone)]/[0.04]"
            textClasses += "text-[10px] md:text-[11px]"
          } else if (node.kind === "accent") {
            baseClasses += " bg-[var(--color-cobalt)]/95 text-[var(--color-obsidian)] hover:shadow-[0_0_30px_rgba(91,141,239,0.45)]"
            textClasses += "text-[10px] md:text-[11px]"
            metaColor = "text-[var(--color-obsidian)]/60"
          } else {
            // scope — chamfered rectangular oscilloscope card.
            baseClasses +=
              " bg-[var(--color-graphite)]/40 border border-[var(--color-cobalt)]/40 text-[var(--color-bone)] backdrop-blur-md hover:border-[var(--color-cobalt)] flex-col items-stretch gap-2 px-3 py-3"
            textClasses += "text-[9px] md:text-[10px]"
          }

          const widthStyle = isMobile ? {} : { left: `${node.desk.x}%`, top: `${node.desk.y}%`, width: `${node.desk.w}rem` }

          return (
            <div
              key={node.id}
              ref={(el) => {
                nodesRef.current[i] = el!
              }}
              className="cap-node relative md:absolute pointer-events-auto touch-none"
              style={isMobile ? {} : widthStyle}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => handleMouseLeave(i)}
              onPointerDown={(e) => handlePointerDown(e, i)}
            >
              <div
                ref={(el) => {
                  magneticRefs.current[i] = el!
                }}
                className={baseClasses}
                style={{
                  ["--cap-stretch" as any]: 1,
                  ["--cap-skew" as any]: "0deg",
                  transform: isMobile ? undefined : "scaleY(var(--cap-stretch)) skewX(var(--cap-skew))",
                  transition: isMobile ? undefined : `transform 220ms ${ease.silk}`,
                  willChange: isMobile ? undefined : "transform",
                  ...bgStyle,
                }}
              >
                {/* Bracket-corner detail — four 8px L-shapes pinned to the
                    rectangle's corners. Pure decoration, gives the HUD feel. */}
                {!isScope && (
                  <>
                    <span aria-hidden className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-60" />
                    <span aria-hidden className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-60" />
                    <span aria-hidden className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-60" />
                    <span aria-hidden className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-60" />
                  </>
                )}

                {isScope ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className={textClasses + " text-[var(--color-cobalt)]"}>{node.label}</span>
                      <span className={"font-mono text-[8px] tabular-nums " + metaColor}>{node.id}</span>
                    </div>
                    <div className="h-[28px] md:h-[34px] w-full bg-[var(--color-obsidian)]/70 border border-[var(--color-cobalt)]/30 overflow-hidden">
                      <Oscilloscope active />
                    </div>
                    <div className="flex items-center justify-between text-[8px] tracking-[0.32em] uppercase font-mono text-[var(--color-dim-strong)]">
                      <span>fragment shader</span>
                      <span className="text-[var(--color-cobalt)] tabular-nums">∼ 60.00 hz</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span aria-hidden className={"font-mono text-[8px] tabular-nums tracking-widest " + metaColor}>
                      {node.id}
                    </span>
                    <span className={textClasses}>{node.label}</span>
                    <span aria-hidden className="flex-1" />
                    <span className={"font-mono text-[8px] tracking-[0.3em] uppercase " + metaColor}>{node.meta}</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
