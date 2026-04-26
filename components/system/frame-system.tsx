"use client"

/**
 * frame-system.tsx — bottom HUD frame + top progress hairline + audit sentinel.
 *
 *  This component does NOT own the top row — the navigation header does.
 *  Its job is to render the page-edge "frame":
 *
 *    1. A 1-pixel scroll-progress hairline pinned just below the header
 *       (top: var(--header-height)). Mates with the header's bottom edge
 *       so the two read as one strip.
 *    2. Bottom-left geocoords + handshake state.
 *    3. Bottom-right pulse counter + section index + audit sentinel chip.
 *    4. mix-blend-difference so the frame is readable against any backdrop.
 *
 *  Producers: VelocityDriver feeds coreStateBus (handshake, section, pulse,
 *  progress); FrameSystem reads from there, never from local state.
 *
 *  The audit sentinel chip in the bottom-right strip is the ONLY UI
 *  affordance to open the audit panel — TelemetryPanel itself no longer
 *  ships a free-floating button. Click or press T to flip the bus.
 */

import { useEffect, useRef } from "react"
import { coreStateBus, type SystemHandshakeState, useCoreSelector } from "@/lib/core-state-bus"
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

  // The sentinel reads `auditOpen` so its label flips OPEN → CLOSE in step
  // with the panel — selector form, so unrelated bus updates (depth,
  // velocity, pulse) do NOT trigger this component to re-render.
  const auditOpen = useCoreSelector((s) => s.auditOpen)

  const toggleAudit = () => {
    coreStateBus.set({ auditOpen: !coreStateBus.get().auditOpen })
  }

  // ── Plain-T keystroke (no modifiers) toggles the audit panel. The
  // existing `?` and `⌘T` shortcuts in TelemetryPanel still work; this is
  // an additional surface, intended for the same keyboard ergonomics that
  // open dev consoles in similar tools (Linear, Things, Vim mode helpers).
  // We hijack ONLY when the user is NOT typing into a form control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return
      if (e.key === "t" || e.key === "T") {
        e.preventDefault()
        toggleAudit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

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
      {/* ── PROGRESS HAIRLINE — sits flush BENEATH the header strip ──
        * The header is fixed at top:0 with content height tracking
        * --header-height; positioning the hairline at this y-coord makes
        * the two read as one continuous element.
        */}
      <div
        className="absolute inset-x-0 h-px"
        style={{
          top: "var(--header-height)",
          background: "color-mix(in oklab, var(--color-bone) 14%, transparent)",
        }}
      />
      <div
        ref={progressRef}
        className="absolute inset-x-0 h-px origin-left"
        style={{
          top: "var(--header-height)",
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

      {/* ═══ BOTTOM-RIGHT — SECTION + PULSE + AUDIT SENTINEL ═══ */}
      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-6 flex items-center gap-4">
        <span className="hidden sm:flex items-center gap-1.5 text-hud-sm">
          <span style={{ color: "color-mix(in oklab, var(--color-bone) 50%, transparent)" }}>SEC_NUM</span>
          <span ref={sectionRef} className="tabular-nums">00</span>
        </span>
        <span className="flex items-center gap-1.5 text-hud-sm">
          <span style={{ color: "color-mix(in oklab, var(--color-bone) 50%, transparent)" }}>PLS</span>
          <span ref={pulseRef} className="tabular-nums">0000</span>
        </span>

        {/* ── AUDIT SENTINEL CHIP ──────────────────────────────────────
          * Zero-radius, 1px --rule border, font-mono 7px. The ONLY
          * affordance to open the audit panel. pointer-events:auto on
          * just this chip — the rest of the frame remains pass-through.
          * mix-blend-difference is inherited from the parent so the
          * chip stays legible against any backdrop.                    */}
        <button
          type="button"
          onClick={toggleAudit}
          aria-label={auditOpen ? "Close audit panel" : "Open audit panel"}
          aria-expanded={auditOpen}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-1.5 py-0.5 font-mono uppercase tabular-nums select-none"
          style={{
            fontSize: "7px",
            letterSpacing: "0.32em",
            border: "1px solid color-mix(in oklab, var(--color-bone) 25%, transparent)",
            color: "color-mix(in oklab, var(--color-bone) 75%, transparent)",
            background: "transparent",
            transition: "color var(--dur-tap) var(--ease-mechanical), border-color var(--dur-tap) var(--ease-mechanical)",
            cursor: "none",
          }}
        >
          <span aria-hidden style={{
            width: "4px",
            height: "4px",
            background: auditOpen ? "var(--color-amber)" : "color-mix(in oklab, var(--color-bone) 40%, transparent)",
            transition: "background var(--dur-tap) var(--ease-mechanical)",
          }} />
          <span>{auditOpen ? "AUDIT · CLOSE" : "AUDIT · [T]"}</span>
        </button>
      </div>
    </div>
  )
}
