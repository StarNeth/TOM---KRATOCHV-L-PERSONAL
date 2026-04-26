"use client"

// components/telemetry-panel.tsx
// ─────────────────────────────────────────────────────────────────────────
// LIVE OSCILLOSCOPE — bottom-right, desktop only.
//
// Renders a 92-sample SVG polyline of coreStateBus.energySmooth, updated
// in a ring buffer in rAF. Direct DOM manipulation — never React state,
// never re-renders. Below the trace: T (turbulence) and V (intensity%).
//
// The instrument is passive. No hover. aria-hidden. When the visitor
// discovers it, they understand what the site is.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from "react"
import { coreStateBus } from "@/lib/core-state-bus"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

const SAMPLES = 92
const W = 112
const H = 48 // trace area only — total panel is 72px tall

export const TelemetryPanel = (): React.ReactElement => {
  const polyRef = useRef<SVGPolylineElement>(null)
  const tRef = useRef<HTMLSpanElement>(null)
  const vRef = useRef<HTMLSpanElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (typeof window === "undefined") return
    const buf = new Float32Array(SAMPLES)
    let alive = true
    let raf = 0
    let frameMod = 0

    const tick = () => {
      if (!alive) return
      // Push current sample, drop the oldest.
      for (let i = 0; i < SAMPLES - 1; i++) buf[i] = buf[i + 1]
      buf[SAMPLES - 1] = coreStateBus.energySmooth

      // Build polyline points string. Update every 2 frames for stability.
      frameMod = (frameMod + 1) % 2
      if (frameMod === 0 && polyRef.current) {
        let pts = ""
        for (let i = 0; i < SAMPLES; i++) {
          const x = (i / (SAMPLES - 1)) * W
          const y = H - buf[i] * (H - 4) - 2
          pts += `${x.toFixed(1)},${y.toFixed(1)} `
        }
        polyRef.current.setAttribute("points", pts.trim())

        // Opacity tier per spec.
        const e = coreStateBus.energySmooth
        const opacity = e < 0.25 ? 0.25 : e < 0.65 ? 0.55 : 0.85
        polyRef.current.setAttribute("opacity", opacity.toString())

        if (tRef.current) tRef.current.textContent = coreStateBus.turbulence.toFixed(3)
        if (vRef.current) vRef.current.textContent = `${Math.round(coreStateBus.intensity * 100)}%`
      }

      raf = requestAnimationFrame(tick)
    }

    if (!reduced) raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="hidden md:block fixed bottom-4 right-4 z-[70] pointer-events-none"
      style={{
        width: 112,
        height: 72,
        background: "var(--glass)",
        border: "1px solid var(--rule)",
        borderRadius: 2,
        padding: "6px 8px",
      }}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", overflow: "visible" }}
      >
        <polyline
          ref={polyRef}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={0.75}
          strokeLinecap="square"
          strokeLinejoin="miter"
          points={`0,${H - 2} ${W},${H - 2}`}
        />
      </svg>
      <div
        className="flex items-center justify-between mt-1"
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 7,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontVariantNumeric: "tabular-nums",
          color: "var(--text-dim)",
        }}
      >
        <span>
          <span style={{ color: "var(--text-data)" }}>T</span>
          <span ref={tRef} style={{ marginLeft: 4 }}>0.000</span>
        </span>
        <span>
          <span style={{ color: "var(--text-data)" }}>V</span>
          <span ref={vRef} style={{ marginLeft: 4 }}>0%</span>
        </span>
      </div>
    </div>
  )
}
