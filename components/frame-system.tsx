"use client"

// components/frame-system.tsx
// ─────────────────────────────────────────────────────────────────────────
// FOUR-CORNER REGISTRATION MARKS
//
// 1px L-shaped lines, 40px long, fixed to the viewport. They are not
// decoration — they establish the viewport as a measurement environment.
// Their opacity rises with `--frame-opacity` (driven by structural
// coupling). On scroll progress through the hero, they march inward.
//
// aria-hidden. Desktop only (the directive: instruments are desktop only).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

const ARM = 40 // px — arm length

const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => {
  // Each corner is two 1px lines forming an L.
  const isTop = pos === "tl" || pos === "tr"
  const isLeft = pos === "tl" || pos === "bl"
  const offset = "16px"
  const v = {
    [isTop ? "top" : "bottom"]: offset,
    [isLeft ? "left" : "right"]: offset,
  } as React.CSSProperties
  return (
    <div className="pointer-events-none absolute" style={v}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          [isLeft ? "left" : "right"]: 0,
          width: `${ARM}px`,
          height: "1px",
          background: `rgba(255,255,255,var(--frame-opacity))`,
        }}
      />
      <span
        aria-hidden
        style={{
          position: "absolute",
          [isTop ? "top" : "bottom"]: 0,
          [isLeft ? "left" : "right"]: 0,
          width: "1px",
          height: `${ARM}px`,
          background: `rgba(255,255,255,var(--frame-opacity))`,
        }}
      />
    </div>
  )
}

export const FrameSystem = (): React.ReactElement | null => {
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // Inset increases with hero scroll progress — calibrated against window
  // scroll, not GSAP, to keep this ~free.
  useEffect(() => {
    if (reduced || typeof window === "undefined") return
    const el = wrapRef.current
    if (!el) return
    let raf = 0
    let alive = true
    const tick = () => {
      if (!alive) return
      const vh = Math.max(1, window.innerHeight)
      const t = Math.min(1, Math.max(0, window.scrollY / vh))
      // Inset additionally modulated by --coupling-aperture (energy).
      // This is small and computed in CSS; here we only push the scroll term.
      el.style.setProperty("--frame-scroll", `${t * 28}px`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="hidden md:block fixed inset-0 z-[60] pointer-events-none"
      style={{
        // The frame inset is base 16px + scroll term + coupling aperture.
        // We drive only the scroll term; aperture is read directly.
        ["--frame-scroll" as string]: "0px",
        padding:
          "calc(var(--frame-scroll) + var(--coupling-aperture, 0px))",
      }}
    >
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />
    </div>
  )
}
