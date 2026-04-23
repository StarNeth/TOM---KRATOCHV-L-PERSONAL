"use client"

/**
 * cursor.tsx — Nuclear Precision Pointer
 * ────────────────────────────────────────────────────────────────────────────
 *  REFRESH-RATE AWARENESS (new)
 *    Lerp coefficients are normalized to a 60Hz baseline. On 120Hz ProMotion
 *    (≈ 8ms rAF delta), the effective lerp pushes to the audit-mandated 0.32.
 *    On 60Hz it stays at ~0.18. The cursor FEELS tethered on both displays.
 *
 *  CURSOR → WEBGL BUS (new)
 *    Every pointermove writes normalized coords + velocity into the shared
 *    cursorBus (see scene.tsx). The WebGL surface consumes this each frame
 *    to render a decaying UV-displacement wake in the cursor's path.
 *    The DOM pointer and the fluid are no longer parallel systems.
 *
 *  PERFORMANCE
 *    • Zero React re-renders after the initial `mounted` flip.
 *    • Single requestAnimationFrame loop, two DOM writes per frame.
 *    • `boxShadow` instead of `filter: drop-shadow` — vector-sharp at scale.
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from "react"
// Import from the standalone lib module — NOT from components/webgl/scene.
// cursor.tsx renders on every page (including /work/[id]) via the root
// layout. Importing the scene module statically would drag `three` and
// `@react-three/postprocessing` into the SSR graph and crash the server
// render (postprocessing touches `window` at module init).
import { cursorBus } from "@/lib/cursor-bus"

// ─── EXPONENTIAL DECAY (analytically frame-rate independent) ───────────────
// `lerp(a, b, k)` is per-frame-percentage and therefore TWICE as aggressive
// at 120Hz as at 60Hz. The correct formulation for a critically-damped
// follow is `x += (target - x) * (1 - exp(-λ·dt))` where λ is a time
// constant in continuous time. At λ = 23, the cursor converges 63% every
// 43ms regardless of whether rAF fires at 60Hz, 120Hz, or 144Hz.
//
// Calibration: at 60Hz (dt ≈ 16.67ms) this matches a legacy per-frame
// lerp of ~0.32 for the main dot and ~0.15 for the trailing ring — the
// same perceptual feel the audit spec requires, but now PROVABLY correct
// at any refresh rate.
const LAMBDA_MAIN  = 23   // 1/s — main dot
const LAMBDA_TRAIL = 10   // 1/s — outer ring trails slightly behind

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

    // Force-hide native cursor globally — CSS specificity battle winner.
    const style = document.createElement("style")
    style.textContent = `* { cursor: none !important; }`
    document.head.appendChild(style)

    let targetX = window.innerWidth  / 2
    let targetY = window.innerHeight / 2
    let mainX   = targetX
    let mainY   = targetY
    let trailX  = targetX
    let trailY  = targetY

    let isHover = false
    let isDown  = false
    let rafId   = 0
    let lastT   = performance.now()

    const render = (now: number) => {
      // dt in SECONDS — the time constant λ is 1/seconds, so convergence
      // depends on wall-clock time, not on how many times rAF has fired.
      // Clamp the top end so a dropped frame can't teleport the cursor.
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      // 1 - exp(-λ·dt) is the closed-form solution to the continuous
      // differential equation dx/dt = -λ·(x - target). Identical
      // perceptual motion at 60Hz, 120Hz, 144Hz.
      const mainDecay  = 1 - Math.exp(-LAMBDA_MAIN  * dt)
      const trailDecay = 1 - Math.exp(-LAMBDA_TRAIL * dt)

      mainX  += (targetX - mainX)  * mainDecay
      mainY  += (targetY - mainY)  * mainDecay
      trailX += (targetX - trailX) * trailDecay
      trailY += (targetY - trailY) * trailDecay

      root.style.transform = `translate3d(${mainX}px, ${mainY}px, 0)`

      const dx = trailX - mainX
      const dy = trailY - mainY
      const ringScale = isHover ? 1.8 : isDown ? 0.7 : 1
      const dotScale  = isHover ? 1.5 : isDown ? 0.7 : 1

      ring.style.transform =
        `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(${ringScale})`
      dot.style.transform  = `translate(-50%, -50%) scale(${dotScale})`
      ring.style.borderColor = isHover
        ? "rgba(255,255,255,1)"
        : "rgba(255,255,255,0.4)"

      // Push the DOM pointer position to the WebGL bus — the fluid
      // reads this each frame and warps its UVs in the cursor's wake.
      cursorBus.writePixel(mainX, mainY)

      rafId = requestAnimationFrame(render)
    }

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }
    const onPointerDown = () => { isDown = true }
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
        isolation: "isolate",
        willChange: "transform",
      }}
    >
      <div
        ref={ringRef}
        className="absolute top-0 left-0 rounded-full"
        style={{
          width: "26px",
          height: "26px",
          border: "1px solid rgba(255,255,255,0.4)",
          willChange: "transform",
          transition: "border-color 0.2s ease-out",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        }}
      />
      <div
        ref={dotRef}
        className="absolute top-0 left-0 bg-white rounded-full"
        style={{
          width: "8px",
          height: "8px",
          willChange: "transform",
          // boxShadow keeps the dot vector-sharp at any scale
          // (filter: drop-shadow would rasterize to bitmap).
          boxShadow: "0 2px 4px rgba(0,0,0,0.8)",
        }}
      />
    </div>
  )
}
