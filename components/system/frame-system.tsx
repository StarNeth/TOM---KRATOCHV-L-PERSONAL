"use client"

/**
 * frame-system.tsx — bottom HUD frame + top progress hairline.
 *
 *  This component does NOT own the top row — the navigation header does.
 *  Its job is to render the page-edge "frame":
 *
 *    1. A 1-pixel scroll-progress hairline pinned to the top of the viewport.
 *    2. Bottom-left geocoords + handshake state.
 *    3. Bottom-right pulse counter + section index.
 *    4. mix-blend-difference so the frame is readable against any backdrop.
 *
 *  Producers: VelocityDriver feeds coreStateBus (handshake, section, pulse,
 *  progress); FrameSystem reads from there, never from local state.
 */

import { useEffect, useRef } from "react"
import { coreStateBus, type SystemHandshakeState } from "@/lib/core-state-bus"
import { velocityBus } from "@/lib/velocity-bus"

const pad2 = (n: number) => n.toString().padStart(2, "0")
const pad4 = (n: number) => n.toString().padStart(4, "0")

const HANDSHAKE_LABEL: Record<SystemHandshakeState, string> = {
  BOOT:           "BOOT",
  IDLE:           "SECURE",
  NAVIGATING:     "HANDSHAKE",
  SECTION_LOCK:   "LOCK · OK",
  CONTACT_ARMED:  "ARMED",
}

export const FrameSystem = () => {
  const handshakeRef = useRef<HTMLSpanElement>(null)
  const sectionRef   = useRef<HTMLSpanElement>(null)
  const pulseRef     = useRef<HTMLSpanElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0

    const tick = () => {
      const cs = coreStateBus.get()
      const v  = velocityBus.get()

      if (handshakeRef.current) {
        handshakeRef.current.textContent = HANDSHAKE_LABEL[cs.handshake] ?? "SECURE"
      }
      if (sectionRef.current) sectionRef.current.textContent = pad2(cs.section)
      if (pulseRef.current)   pulseRef.current.textContent   = pad4(cs.clickPulse % 10000)

      // Top progress hairline scrubs with Lenis-smoothed progress.
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${v.progress.toFixed(4)})`
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[150] mix-blend-difference"
      style={{
        color: "var(--color-bone)",
        fontFeatureSettings: '"tnum" 1, "zero" 1',
      }}
    >
      {/* ── PROGRESS HAIRLINE — y=0, 1px, scrubs with Lenis ── */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "color-mix(in oklab, var(--color-bone) 14%, transparent)" }}
      />
      <div
        ref={progressRef}
        className="absolute inset-x-0 top-0 h-px origin-left"
        style={{
          background: "var(--color-bone)",
          transform: "scaleX(0)",
          willChange: "transform",
        }}
      />

      {/* ═══ BOTTOM-LEFT — GEOCOORDINATES + HANDSHAKE ═══ */}
      <div className="absolute bottom-3 left-3 md:bottom-4 md:left-6 flex items-center gap-3">
        <span className="text-hud-sm" style={{ color: "color-mix(in oklab, var(--color-bone) 70%, transparent)" }}>
          N&nbsp;50.0755&nbsp;·&nbsp;E&nbsp;14.4378
        </span>
        <span className="hidden sm:inline-block w-6 h-px" style={{ background: "color-mix(in oklab, var(--color-bone) 30%, transparent)" }} />
        <span className="hidden sm:flex items-center gap-1.5 text-hud-sm">
          <span style={{ color: "color-mix(in oklab, var(--color-bone) 50%, transparent)" }}>SEC</span>
          <span ref={handshakeRef} className="tabular-nums">SECURE</span>
        </span>
      </div>

      {/* ═══ BOTTOM-RIGHT — SECTION + PULSE COUNTER ═══ */}
      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-6 flex items-center gap-4">
        <span className="hidden sm:flex items-center gap-1.5 text-hud-sm">
          <span style={{ color: "color-mix(in oklab, var(--color-bone) 50%, transparent)" }}>SEC_NUM</span>
          <span ref={sectionRef} className="tabular-nums">00</span>
        </span>
        <span className="flex items-center gap-1.5 text-hud-sm">
          <span style={{ color: "color-mix(in oklab, var(--color-bone) 50%, transparent)" }}>PLS</span>
          <span ref={pulseRef} className="tabular-nums">0000</span>
        </span>
      </div>
    </div>
  )
}
