"use client"

/**
 * telemetry-panel.tsx — keyboard-toggleable audit overlay.
 *
 *  The panel is a pure CONSUMER of coreStateBus.auditOpen. The toggle
 *  affordance lives in <FrameSystem /> (bottom-right sentinel chip) +
 *  global key shortcut (`?` here, plain `T` in FrameSystem). Because the
 *  state is in the bus, any surface can drive the panel without touching
 *  this file.
 *
 *  Renders deeper system readouts than the always-visible frame HUD:
 *    UPTIME, last click position, hovered project / zone, raw velocity,
 *    cursor energy, refresh rate, color tokens, last audit event.
 *
 *  Mounted once at the root via SystemOverlay. Slides in from the right
 *  edge. Collapsed by default — invisible until invoked.
 *
 *  Why DOM refs + rAF over React state? At 60Hz, a state-driven panel
 *  would re-render thirty rows of text 60×/s. The panel writes textContent
 *  directly into ref-bound spans → zero React work during scroll.
 */

import { useEffect, useRef } from "react"
import { coreStateBus, useCoreSelector } from "@/lib/core-state-bus"
import { velocityBus } from "@/lib/velocity-bus"
import { cursorBus } from "@/lib/cursor-bus"
import { useDisplayRefresh } from "@/hooks/use-display-refresh"

const pad2 = (n: number) => n.toString().padStart(2, "0")

// Section label used by the audit row. Index 0 = hero, 1 = about, …
// Mirrors the velocity-driver's SECTION_IDS array order with hero prepended.
const SECTION_LABELS = ["HERO", "ABOUT", "WORK", "CAPABILITIES", "CONTACT"] as const

export const TelemetryPanel = () => {
  // Driven by the bus — local React state is gone. Selector form so we
  // re-render only when `auditOpen` flips, not on velocity / pulse / depth
  // ticks.
  const open = useCoreSelector((s) => s.auditOpen)
  const refresh = useDisplayRefresh()

  const upRef     = useRef<HTMLSpanElement>(null)
  const vRawRef   = useRef<HTMLSpanElement>(null)
  const vNormRef  = useRef<HTMLSpanElement>(null)
  const vIntRef   = useRef<HTMLSpanElement>(null)
  const cxRef     = useRef<HTMLSpanElement>(null)
  const cyRef     = useRef<HTMLSpanElement>(null)
  const cVelRef   = useRef<HTMLSpanElement>(null)
  const cEnRef    = useRef<HTMLSpanElement>(null)
  const hovRef    = useRef<HTMLSpanElement>(null)
  const zoneRef   = useRef<HTMLSpanElement>(null)
  const clickRef  = useRef<HTMLSpanElement>(null)
  const auditRef  = useRef<HTMLSpanElement>(null)

  // ── KEYBOARD SHORTCUT (`?`, `⌘T`) ──
  // The plain-T binding lives in FrameSystem so the sentinel chip and
  // keyboard share a producer. Here we keep ONLY the documented power-user
  // shortcuts (`?` for the same reason every dev tool uses it, ⌘T for
  // people who want a meta-prefixed toggle). Esc collapses.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return

      if (e.key === "?" || (e.key.toLowerCase() === "t" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        coreStateBus.set({ auditOpen: !coreStateBus.get().auditOpen })
        return
      }
      if (e.key === "Escape" && coreStateBus.get().auditOpen) {
        coreStateBus.set({ auditOpen: false })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // ── LIVE WRITES ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const cs  = coreStateBus.get()
      const vb  = velocityBus.get()
      const cb  = cursorBus.get()

      // UPTIME
      if (upRef.current) {
        const secs = Math.floor((now - start) / 1000)
        const h = Math.floor(secs / 3600)
        const m = Math.floor((secs % 3600) / 60)
        const s = secs % 60
        upRef.current.textContent = `${pad2(h)}:${pad2(m)}:${pad2(s)}`
      }

      if (vRawRef.current)  vRawRef.current.textContent  = vb.raw.toFixed(2)
      if (vNormRef.current) vNormRef.current.textContent = vb.normalized.toFixed(3)
      if (vIntRef.current)  vIntRef.current.textContent  = vb.intensity.toFixed(3)

      if (cxRef.current)  cxRef.current.textContent  = cb.x.toFixed(3)
      if (cyRef.current)  cyRef.current.textContent  = cb.y.toFixed(3)
      if (cVelRef.current) cVelRef.current.textContent = Math.hypot(cb.vx, cb.vy).toFixed(3)
      if (cEnRef.current) cEnRef.current.textContent = cb.energy.toFixed(3)

      if (hovRef.current)  hovRef.current.textContent  = cs.hoveredProject ?? "—"
      if (zoneRef.current) zoneRef.current.textContent = cs.hoveredZone.toString()
      if (clickRef.current) clickRef.current.textContent = `${cs.clickX.toFixed(0)}, ${cs.clickY.toFixed(0)}`

      // ── AUDIT ROW ──────────────────────────────────────────────────
      // Format: "<CODE> · <SECTION> · {n}s ago" updating live every frame.
      // When no audit has fired yet we show an em-dash. Section is derived
      // from coreStateBus.section index (0..4) — that's where the audit
      // event was *captured*, not necessarily where it originated, but in
      // practice they coincide because audit producers are scoped per
      // section. Floor to integer seconds; rAF gives us freshness, but
      // millisecond precision would just flicker.
      if (auditRef.current) {
        if (cs.audit) {
          const ago = Math.max(0, Math.floor((now - cs.audit.at) / 1000))
          const sectionLabel = SECTION_LABELS[Math.max(0, Math.min(SECTION_LABELS.length - 1, cs.section))] ?? "—"
          auditRef.current.textContent = `${cs.audit.code} · ${sectionLabel} · ${ago}s ago`
        } else {
          auditRef.current.textContent = "—"
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [open])

  return (
    <aside
      role="dialog"
      aria-label="System audit panel"
      aria-hidden={!open}
      className="fixed z-[160] top-0 right-0 h-screen w-[min(380px,90vw)] text-bone"
      style={{
        background: "color-mix(in oklab, var(--color-obsidian) 85%, transparent)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid color-mix(in oklab, var(--color-bone) 10%, transparent)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: `transform 700ms var(--ease-silk)`,
        willChange: "transform",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between px-5 py-4 border-b border-bone/10">
          <span className="text-hud text-bone">AUDIT · TELEMETRY</span>
          <button
            type="button"
            onClick={() => coreStateBus.set({ auditOpen: false })}
            className="text-hud-sm text-bone/50 hover:text-bone"
            aria-label="Close audit panel"
            style={{ transition: `color 240ms var(--ease-mechanical)`, cursor: "none" }}
          >
            ESC
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">
          <Section label="DISPLAY">
            <Row k="REFRESH"  v={`${refresh.hz} Hz`} />
            <Row k="DT"        v={`${(refresh.dt * 1000).toFixed(2)} ms`} />
            <Row k="MEASURED"  v={refresh.measured ? "TRUE" : "PENDING"} />
          </Section>

          <Section label="SESSION">
            <Row k="UPTIME" v={<span ref={upRef}>00:00:00</span>} />
          </Section>

          <Section label="VELOCITY">
            <Row k="RAW"        v={<span ref={vRawRef}>0.00</span>} />
            <Row k="NORM"       v={<span ref={vNormRef}>0.000</span>} />
            <Row k="INTENSITY"  v={<span ref={vIntRef}>0.000</span>} />
          </Section>

          <Section label="CURSOR">
            <Row k="X"      v={<span ref={cxRef}>0.000</span>} />
            <Row k="Y"      v={<span ref={cyRef}>0.000</span>} />
            <Row k="VEL"    v={<span ref={cVelRef}>0.000</span>} />
            <Row k="ENERGY" v={<span ref={cEnRef}>0.000</span>} />
          </Section>

          <Section label="STATE">
            <Row k="HOVER PROJECT" v={<span ref={hovRef}>—</span>} />
            <Row k="WEBGL ZONE"    v={<span ref={zoneRef}>-1</span>} />
            <Row k="LAST CLICK"    v={<span ref={clickRef}>—</span>} />
            <Row k="LAST AUDIT"    v={<span ref={auditRef}>—</span>} />
          </Section>

          <Section label="PALETTE">
            <Swatch token="--color-obsidian" label="OBSIDIAN" />
            <Swatch token="--color-graphite" label="GRAPHITE" />
            <Swatch token="--color-bone"     label="BONE" />
            <Swatch token="--color-cobalt"   label="COBALT" />
            <Swatch token="--color-amber"    label="AMBER" />
            <Swatch token="--color-surgical" label="SURGICAL" />
          </Section>
        </div>

        <footer className="px-5 py-3 border-t border-bone/10 text-hud-sm text-bone/40">
          <span>SHORTCUT&nbsp;·&nbsp;[T] OR ? OR ⌘T</span>
        </footer>
      </div>
    </aside>
  )
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-1.5">
    <h3 className="text-hud-sm text-bone/40 mb-1">{label}</h3>
    <div className="flex flex-col gap-1">{children}</div>
  </section>
)

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-center justify-between text-hud-sm">
    <span className="text-bone/50">{k}</span>
    <span className="text-bone tabular-nums">{v}</span>
  </div>
)

const Swatch = ({ token, label }: { token: string; label: string }) => (
  <div className="flex items-center justify-between text-hud-sm">
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="block w-3 h-3 border border-bone/20"
        style={{ backgroundColor: `var(${token})` }}
      />
      <span className="text-bone/70">{label}</span>
    </div>
    <span className="text-bone/40 tabular-nums">{token}</span>
  </div>
)
