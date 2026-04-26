"use client"

/**
 * cursor.tsx — Nuclear Precision Pointer
 * ────────────────────────────────────────────────────────────────────────────
 *  REFRESH-RATE AWARENESS
 *    Lerp coefficients are normalized to a 60Hz baseline. On 120Hz ProMotion
 *    (≈ 8ms rAF delta), the effective lerp pushes to the audit-mandated 0.32.
 *    On 60Hz it stays at ~0.18. The cursor FEELS tethered on both displays.
 *
 *  CURSOR → WEBGL BUS
 *    Every pointermove writes normalized coords + velocity into the shared
 *    cursorBus (see scene.tsx). The WebGL surface consumes this each frame
 *    to render a decaying UV-displacement wake in the cursor's path.
 *
 *  COLOR TOKEN MIGRATION (revision 02)
 *    The cursor previously hard-coded rgba(255,255,255,...) literals. It now
 *    reads from CSS custom properties:
 *      --cursor-core   → resolved from --color-bone   (the dot, hover ring fill)
 *      --cursor-rule   → resolved from --color-border (idle ring border)
 *      --cursor-data   → resolved from --color-bone   (text on the chip)
 *    Resolution happens ONCE at mount via getComputedStyle, then cached on
 *    refs — the rAF loop never reflows.
 *
 *  AUDIT CHIP (revision 02)
 *    Subscribes to coreStateBus.audit. When a one-shot audit event lands,
 *    a hairline `RECORD ⊙` chip appears 18px above the dot, holds 2s,
 *    then fades. Pure imperative DOM — no React re-renders.
 *
 *  PERFORMANCE
 *    • Zero React re-renders after the initial `mounted` flip.
 *    • Single requestAnimationFrame loop, three DOM writes per frame.
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
import { coreStateBus } from "@/lib/core-state-bus"

// ─── EXPONENTIAL DECAY (analytically frame-rate independent) ───────────────
// `lerp(a, b, k)` is per-frame-percentage and therefore TWICE as aggressive
// at 120Hz as at 60Hz. The correct formulation for a critically-damped
// follow is `x += (target - x) * (1 - exp(-λ·dt))` where λ is a time
// constant in continuous time. At λ = 23, the cursor converges 63% every
// 43ms regardless of whether rAF fires at 60Hz, 120Hz, or 144Hz.
//
// Calibration: at 60Hz (dt ≈ 16.67ms) this matches a legacy per-frame
// lerp of ~0.32 for the main dot and ~0.15 for the trailing ring.
const LAMBDA_MAIN  = 23   // 1/s — main dot
const LAMBDA_TRAIL = 10   // 1/s — outer ring trails slightly behind

// ─── AUDIT CHIP TIMING ──────────────────────────────────────────────────────
// How long the RECORD chip remains visible after an audit event lands.
const AUDIT_CHIP_HOLD_MS = 2000
const AUDIT_CHIP_FADE_MS = 200

export const Cursor = () => {
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef  = useRef<HTMLDivElement>(null)
  const chipRef = useRef<HTMLDivElement>(null)

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
    const chip = chipRef.current // may be null if the chip is gated out

    // ─── TOKEN RESOLUTION ──
    // Read the design tokens ONCE here so the rAF loop can write them as
    // pre-baked rgba strings. We resolve via getComputedStyle on document
    // root; tokens that are oklch() literals get resolved to whatever
    // computed color the browser sees, including the eventual themed value.
    const cs = getComputedStyle(document.documentElement)
    const tokenCore =
      cs.getPropertyValue("--cursor-core").trim() ||
      cs.getPropertyValue("--color-bone").trim() ||
      "rgba(245,243,238,1)" // hard fallback — bone @ 0.94 lightness
    const tokenRule =
      cs.getPropertyValue("--cursor-rule").trim() ||
      cs.getPropertyValue("--color-border").trim() ||
      "rgba(60,60,60,0.4)"

    // ─── SET INITIAL COLOR STATES ──
    // Tokens applied imperatively so React doesn't have to re-render on
    // mount just to apply colors.
    dot.style.backgroundColor = tokenCore
    ring.style.borderColor = tokenRule

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
      // differential equation dx/dt = -λ·(x - target).
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
      ring.style.borderColor = isHover ? tokenCore : tokenRule

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

    // ─── AUDIT CHIP SUBSCRIPTION ────────────────────────────────────────
    // Listen for any new audit event on the bus. We compare `at` (the
    // timestamp) to detect a NEW event versus the same event being
    // re-broadcast on subscriber re-attach. Show, hold, fade, hide.
    let lastAuditAt = coreStateBus.get().audit?.at ?? 0
    let chipHideTimer = 0
    let chipFadeTimer = 0

    const showChip = () => {
      if (!chip) return
      window.clearTimeout(chipHideTimer)
      window.clearTimeout(chipFadeTimer)
      chip.style.transition = "none"
      chip.style.opacity = "1"
      // Force reflow so the next transition picks up.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      chip.offsetHeight
      chip.style.transition = `opacity ${AUDIT_CHIP_FADE_MS}ms var(--ease-decay, ease-out)`
      chipHideTimer = window.setTimeout(() => {
        if (chip) chip.style.opacity = "0"
      }, AUDIT_CHIP_HOLD_MS)
    }

    const offAudit = coreStateBus.subscribe((s) => {
      const at = s.audit?.at ?? 0
      if (at > lastAuditAt) {
        lastAuditAt = at
        showChip()
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup",   onPointerUp)
      window.removeEventListener("pointerover", onPointerOver)
      offAudit()
      window.clearTimeout(chipHideTimer)
      window.clearTimeout(chipFadeTimer)
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
          // border color is set imperatively from --cursor-rule on mount.
          borderWidth: "1px",
          borderStyle: "solid",
          willChange: "transform",
          transition: "border-color 0.2s var(--ease-silk, ease-out)",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        }}
      />
      <div
        ref={dotRef}
        className="absolute top-0 left-0 rounded-full"
        style={{
          width: "8px",
          height: "8px",
          // background color is set imperatively from --cursor-core on mount.
          willChange: "transform",
          // boxShadow keeps the dot vector-sharp at any scale
          // (filter: drop-shadow would rasterize to bitmap).
          boxShadow: "0 2px 4px rgba(0,0,0,0.8)",
        }}
      />
      {/* RECORD chip — pinned 18px above the dot. Hidden by default
          (opacity 0). The audit subscription flips opacity on/off.
          font-mono 7px is the system's smallest readable mono size. */}
      <div
        ref={chipRef}
        className="absolute font-mono uppercase tabular-nums"
        style={{
          top: "-18px",
          left: "50%",
          transform: "translate(-50%, -100%)",
          fontSize: "7px",
          letterSpacing: "0.16em",
          padding: "2px 6px",
          color: "var(--cursor-data, var(--color-bone))",
          backgroundColor: "rgba(8,8,10,0.85)",
          border: "1px solid var(--cursor-rule, var(--color-border))",
          borderRadius: 0,
          opacity: 0,
          whiteSpace: "nowrap",
          willChange: "opacity",
        }}
      >
        RECORD ⊙
      </div>
    </div>
  )
}
