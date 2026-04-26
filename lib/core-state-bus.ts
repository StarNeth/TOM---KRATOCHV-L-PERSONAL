/**
 * core-state-bus.ts — the single, system-wide state channel.
 *
 *  All visual surfaces (header HUD, frame system, telemetry panel, hero,
 *  projects, scene shader) reach into this bus to read the current state
 *  of the page. Producers write; subscribers either read once-per-frame
 *  in a rAF loop OR receive structural-coupling notifications.
 *
 *  Distinct from lib/velocity-bus.ts (raw scroll velocity) and
 *  lib/cursor-bus.ts (raw cursor pixel state). Those two buses are the
 *  RAW physical inputs — this bus is the SYNTHESIZED system state derived
 *  from them plus DOM observations (IntersectionObserver, click events,
 *  hover targets, etc).
 *
 *  Why a hand-rolled bus instead of zustand? The render-cost-sensitive
 *  consumers (frame-system, telemetry-panel, hero) read every frame from
 *  rAF — they never want a React subscription. The few components that DO
 *  want React reactivity (e.g. AuditPanel toggle button) get a tiny
 *  `useCoreState()` hook below that subscribes via a microtask-batched
 *  notifier. Best of both worlds, zero state-management overhead.
 *
 *  Producers update via `coreStateBus.set({ partial })`; consumers read
 *  via `coreStateBus.get()` or `coreStateBus.subscribe(fn)`.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SHAPE
// ─────────────────────────────────────────────────────────────────────────────
export type SystemHandshakeState =
  | "BOOT"
  | "IDLE"
  | "NAVIGATING"
  | "SECTION_LOCK"
  | "CONTACT_ARMED"

export type WebGLZone = -1 | 0 | 1 | 2 | 3
//                              hero, about, work, capabilities/contact
// (mirrors the zoneOverride values the shader already accepts)

export type CoreState = {
  // ── DEPTH / VELOCITY (mirrored from velocity-bus, but normalized + history-tracked) ──
  /** scrollY / innerHeight, unbounded. 0 at top of page. */
  depth: number
  /** [-1, 1] smoothed scroll velocity. */
  vNorm: number
  /** [0, 1] absolute smoothed velocity magnitude. */
  vIntensity: number
  /** [0, 1] global scroll progress. */
  progress: number

  // ── SECTION ──
  /** 0=hero, 1=about, 2=work, 3=capabilities, 4=contact. */
  section: number
  /** Last time the section index changed (for transition effects). */
  sectionChangedAt: number

  // ── HOVER / FOCUS ──
  /** Project slug currently being hovered, or null. */
  hoveredProject: string | null
  /** Zone the WebGL shader should bias toward (set when a project is hovered). */
  hoveredZone: WebGLZone

  // ── CLICK PULSE ──
  /** Last click position in viewport pixels. {-1, -1} when none. */
  clickX: number
  clickY: number
  /** Monotonic counter — increments on every click. Consumers compare to detect new pulses. */
  clickPulse: number

  // ── HANDSHAKE ──
  handshake: SystemHandshakeState

  // ── AUDIT PANEL ──
  /** Whether the deeper audit/telemetry overlay is expanded. */
  auditOpen: boolean
}

const initial: CoreState = {
  depth: 0,
  vNorm: 0,
  vIntensity: 0,
  progress: 0,
  section: 0,
  sectionChangedAt: 0,
  hoveredProject: null,
  hoveredZone: -1,
  clickX: -1,
  clickY: -1,
  clickPulse: 0,
  handshake: "BOOT",
  auditOpen: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION — single mutable record + listener Set.
// rAF-style consumers ignore the listener Set entirely. React-style consumers
// hook into it via useCoreState().
// ─────────────────────────────────────────────────────────────────────────────
// `state` is the LIVE mutable record. rAF consumers read from this on every
// frame and must see the current values without going through React.
const state: CoreState = { ...initial }

// `snapshot` is a frozen-in-time copy that React's useSyncExternalStore
// relies on for change detection. We swap its reference inside `flush()`
// every time `set()` mutates `state` — that way React sees a NEW reference
// (triggers re-render) only when something actually changed.
let snapshot: CoreState = { ...state }
const listeners = new Set<(s: CoreState) => void>()

let scheduled = false
const flush = () => {
  scheduled = false
  // New reference => useSyncExternalStore sees a change.
  snapshot = { ...state }
  listeners.forEach((fn) => fn(snapshot))
}

const notify = () => {
  if (scheduled) return
  scheduled = true
  // microtask = same tick, after current synchronous work.
  queueMicrotask(flush)
}

export const coreStateBus = {
  /** Live read — mutable state, freshest values, for rAF loops. */
  get: (): CoreState => state,

  /**
   * Snapshot read — stable reference between mutations. Used by React's
   * useSyncExternalStore tearing-detection. Do NOT mutate.
   */
  getSnapshot: (): CoreState => snapshot,

  /** Apply a partial update. Triggers (debounced) listener notification. */
  set(patch: Partial<CoreState>) {
    let changed = false
    for (const k in patch) {
      const key = k as keyof CoreState
      if (patch[key] !== undefined && (state as any)[key] !== patch[key]) {
        ;(state as any)[key] = patch[key]
        changed = true
      }
    }
    if (changed) notify()
  },

  /**
   * Subscribe to bus updates. Returns an unsubscribe function.
   * Listener is invoked on the next microtask after any .set() that
   * actually changed something.
   */
  subscribe(fn: (s: CoreState) => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /** Reset to initial state — used by tests and by HMR boundaries. */
  __reset() {
    Object.assign(state, initial)
    notify()
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// REACT BRIDGE — for the rare component that needs to re-render on state changes.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useSyncExternalStore } from "react"

const subscribe = (fn: () => void) => coreStateBus.subscribe(fn)
const getServerSnapshot = () => initial

export function useCoreState(): CoreState {
  return useSyncExternalStore(subscribe, coreStateBus.getSnapshot, getServerSnapshot)
}

/**
 * useCoreSelector — read a SLICE of the bus without re-rendering on
 * unrelated changes. Same contract as Zustand's selector form.
 */
export function useCoreSelector<T>(selector: (s: CoreState) => T): T {
  const [value, setValue] = useState<T>(() => selector(state))
  useEffect(() => {
    let prev = selector(state)
    setValue(prev)
    return coreStateBus.subscribe((s) => {
      const next = selector(s)
      if (next !== prev) {
        prev = next
        setValue(next)
      }
    })
  }, [selector])
  return value
}
