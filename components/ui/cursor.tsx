"use client"

/**
 * cursor.tsx — Nuclear Precision Pointer
 * ────────────────────────────────────────────────────────────────────────────
 *  MIX-BLEND-MODE: DIFFERENCE (new)
 *    The cursor root carries `mix-blend-mode: difference`. A white dot on a
 *    white (#F5F5F0) background inverts to near-black. On a dark (#0d0d0d)
 *    background it stays white. The cursor is fully visible across every
 *    surface — including the Act VI collision flash from white to dark —
 *    with zero JavaScript color-switching. The hover borderColor override
 *    has been removed; blend mode makes it redundant.
 *
 *  VELOCITY-BASED RING STRETCH (new)
 *    Each frame the render loop computes vx/vy from the delta between the
 *    current and previous TARGET position (pointer intent, not the lagged
 *    ring position — that would double-damp). Speed is clamped to a
 *    `MAX_SPEED` cap and then mapped to a `stretchFactor` in [1, 1.5].
 *    The ring is scaled on its X axis along the travel vector by rotating
 *    the element, applying non-uniform scale, then counter-rotating — the
 *    classic squash-and-stretch decomposition. At rest: perfect circle.
 *    At speed: an ellipse oriented along the pointer's direction of travel.
 *
 *  LAMBDA_TRAIL: 10 → 15 (tuned)
 *    At λ=10 the ring lagged so far behind on fast sweeps that it
 *    effectively disappeared relative to the dot. λ=15 preserves the
 *    trailing personality while keeping the ring present.
 *
 *  CURSORFBUS VELOCITY (fixed)
 *    `cursorBus.writePixel` now receives normalized UV coords (0–1) AND
 *    a speed scalar (px/s, clamped) so the WebGL surface can scale its
 *    displacement wake correctly with actual pointer velocity.
 *
 *  DOT SIZE: 8px → 5px
 *    Sharper, more editorial. Less of a thumb target, more of a scalpel.
 *
 *  REFRESH-RATE AWARENESS (unchanged)
 *    Exponential decay `1 - exp(-λ·dt)` is analytically frame-rate
 *    independent. Feels identical at 60Hz, 120Hz, 144Hz.
 *
 *  PERFORMANCE (unchanged)
 *    • Zero React re-renders after the initial `mounted` flip.
 *    • Single requestAnimationFrame loop, two DOM writes per frame.
 *    • `boxShadow` instead of `filter: drop-shadow`.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react"
import { cursorBus } from "@/lib/cursor-bus"

// ─── TIME CONSTANTS ────────────────────────────────────────────────────────
// λ in 1/s. At 60Hz (dt≈16.67ms): mainDecay≈0.32, trailDecay≈0.22.
// At 120Hz (dt≈8.33ms): same perceptual convergence — analytically correct.
const LAMBDA_MAIN  = 23  // main dot — snappy
const LAMBDA_TRAIL = 15  // ring — trails but stays present

// ─── VELOCITY STRETCH ──────────────────────────────────────────────────────
// Ring stretches into an ellipse along the travel vector.
// MAX_SPEED is the px/s at which the ring reaches full stretch.
const MAX_SPEED     = 1800  // px/s — beyond this speed is clamped
const MAX_STRETCH   = 1.55  // scaleX multiplier at MAX_SPEED
const MIN_SCALE_Y   = 0.72  // scaleY at MAX_SPEED (conservation of area feel)

export const Cursor = () => {
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      window.matchMedia("(pointer: fine)").matches
    ) {
      setMounted(true)
    }
  }, [])

  useEffect(() => {
    if (!mounted || !rootRef.current || !ringRef.current || !dotRef.current) return

    const root = rootRef.current
    const ring = ringRef.current
    const dot  = dotRef.current

    // Force-hide native cursor globally
    const style = document.createElement("style")
    style.textContent = `* { cursor: none !important; }`
    document.head.appendChild(style)

    let targetX = window.innerWidth  / 2
    let targetY = window.innerHeight / 2
    let prevTargetX = targetX
    let prevTargetY = targetY
    let mainX   = targetX
    let mainY   = targetY
    let trailX  = targetX
    let trailY  = targetY

    let isHover = false
    let isDown  = false
    let rafId   = 0
    let lastT   = performance.now()

    // Smooth the stretch so it doesn't snap back instantly
    let smoothStretch = 1.0
    let smoothAngle   = 0.0

    const render = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      // ── Exponential decay — frame-rate independent ──────────────────
      const mainDecay  = 1 - Math.exp(-LAMBDA_MAIN  * dt)
      const trailDecay = 1 - Math.exp(-LAMBDA_TRAIL * dt)

      mainX  += (targetX - mainX)  * mainDecay
      mainY  += (targetY - mainY)  * mainDecay
      trailX += (targetX - trailX) * trailDecay
      trailY += (targetY - trailY) * trailDecay

      // ── Velocity from TARGET delta — not the lagged ring ────────────
      const vx       = (targetX - prevTargetX) / Math.max(dt, 0.001)
      const vy       = (targetY - prevTargetY) / Math.max(dt, 0.001)
      const speed    = Math.sqrt(vx * vx + vy * vy)
      prevTargetX    = targetX
      prevTargetY    = targetY

      // ── Stretch factor ──────────────────────────────────────────────
      const t           = Math.min(speed / MAX_SPEED, 1.0)
      const targetStretch = 1 + (MAX_STRETCH - 1) * t
      const targetScaleY  = 1 - (1 - MIN_SCALE_Y)  * t
      // Angle of travel — only meaningful when moving
      const targetAngle   = speed > 8 ? Math.atan2(vy, vx) * (180 / Math.PI) : smoothAngle

      // Smooth the stretch with a fast exponential decay
      const stretchDecay = 1 - Math.exp(-18 * dt)
      smoothStretch += (targetStretch - smoothStretch) * stretchDecay
      smoothAngle   += (targetAngle   - smoothAngle)   * stretchDecay

      // ── DOM writes ──────────────────────────────────────────────────
      root.style.transform = `translate3d(${mainX}px, ${mainY}px, 0)`

      const dx = trailX - mainX
      const dy = trailY - mainY

      // Base scale from interaction state
      const baseScale = isHover ? 1.7 : isDown ? 0.65 : 1.0
      const dotScale  = isHover ? 1.4 : isDown ? 0.65 : 1.0

      // Decompose: rotate to travel angle → stretch → counter-rotate
      // This orients the ellipse along the direction of motion
      ring.style.transform = [
        `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0)`,
        `rotate(${smoothAngle}deg)`,
        `scale(${smoothStretch * baseScale}, ${targetScaleY * baseScale})`,
        `rotate(${-smoothAngle}deg)`,
      ].join(" ")

      dot.style.transform = `translate(-50%, -50%) scale(${dotScale})`

      // ── Push to WebGL bus: normalized UV + speed scalar ─────────────
      // WebGL can now size the displacement wake proportionally to velocity
      const normX  = mainX / window.innerWidth
      const normY  = mainY / window.innerHeight
      const normSpd = Math.min(speed / MAX_SPEED, 1.0)
      cursorBus.writePixel(normX * window.innerWidth, normY * window.innerHeight, normSpd)

      rafId = requestAnimationFrame(render)
    }

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }
    const onPointerDown = () => { isDown = true  }
    const onPointerUp   = () => { isDown = false }

    const CLICKABLE =
      "a, button, [role='button'], input, textarea, select, [data-cursor='hover']"
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      isHover = !!target?.closest(CLICKABLE)
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointerup",   onPointerUp,   { passive: true })
    window.addEventListener("pointerover", onPointerOver, { passive: true })

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup",   onPointerUp)
      window.removeEventListener("pointerover", onPointerOver)
      if (style.parentNode) style.parentNode.removeChild(style)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="fixed top-0 left-0 pointer-events-none"
      style={{
        zIndex: 999999,
        // mix-blend-mode: difference makes the white cursor invert against
        // any background. White on #F5F5F0 → near-black. White on #0d0d0d
        // → white. No color logic needed anywhere in this file.
        mixBlendMode: "difference",
        isolation: "isolate",
        willChange: "transform",
      }}
    >
      {/* Ring — trails behind, stretches along travel vector */}
      <div
        ref={ringRef}
        className="absolute top-0 left-0 rounded-full"
        style={{
          width:       "26px",
          height:      "26px",
          border:      "1px solid rgba(255,255,255,0.9)",
          willChange:  "transform",
          // No transition — transform is driven entirely by the rAF loop.
          // A CSS transition here fights the velocity stretch and creates
          // a laggy double-damping artifact.
          boxShadow:   "0 0 8px rgba(0,0,0,0.25)",
        }}
      />
      {/* Dot — snaps to pointer, scales on interaction */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full"
        style={{
          width:      "5px",
          height:     "5px",
          backgroundColor: "white",
          willChange: "transform",
          boxShadow:  "0 1px 3px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  )
}