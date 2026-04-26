/**
 * structural-coupling.ts — declarative wiring between bus signals and the DOM.
 *
 *  Every component that wants to react to scroll velocity, scroll depth, the
 *  current section, or hover/click pulses ends up writing the same boilerplate:
 *
 *    useEffect(() => {
 *      let raf = 0
 *      const tick = () => {
 *        const v = velocityBus.get()
 *        el.style.setProperty("--x", `${v.normalized * 8}px`)
 *        raf = requestAnimationFrame(tick)
 *      }
 *      raf = requestAnimationFrame(tick)
 *      return () => cancelAnimationFrame(raf)
 *    }, [])
 *
 *  This file collapses that pattern into a few helpers. Each helper:
 *
 *    1. Returns a cleanup function (unmount → cancelAnimationFrame).
 *    2. Reads from the bus; writes ONLY CSS custom properties (zero layout
 *       thrash, zero React re-renders). Components consume those vars in
 *       their `style` block.
 *    3. Is opt-in — components keep their imperative loops if they need
 *       complex math, but for the 80% case ("multiply velocity by N, write
 *       it as a CSS var") this is a one-liner.
 *
 *  Architecturally this is the wiring layer between the SIGNAL bus
 *  (velocity-bus, cursor-bus, core-state-bus) and the OUTPUT layer (DOM).
 *  It does no transformation that the consumers couldn't do themselves —
 *  it just shrinks the surface area.
 */

import { velocityBus } from "./velocity-bus"
import { coreStateBus, type CoreState } from "./core-state-bus"
import { stepSpring, spring as springs, type SpringConfig, type SpringState } from "./motion"

type Cleanup = () => void

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — a single rAF loop registry. Multiple coupling subscriptions share
// ONE rAF tick rather than each spawning their own. Cuts overhead linearly.
// ─────────────────────────────────────────────────────────────────────────────
type FrameCallback = (now: number, dt: number) => void

const callbacks = new Set<FrameCallback>()
let runRaf = 0
let runLast = 0

const ensureRunning = () => {
  if (runRaf) return
  runLast = performance.now()
  const tick = (now: number) => {
    const dt = Math.min((now - runLast) / 1000, 0.05)
    runLast = now
    callbacks.forEach((fn) => fn(now, dt))
    runRaf = callbacks.size > 0 ? requestAnimationFrame(tick) : 0
  }
  runRaf = requestAnimationFrame(tick)
}

const registerFrame = (fn: FrameCallback): Cleanup => {
  callbacks.add(fn)
  ensureRunning()
  return () => {
    callbacks.delete(fn)
    if (callbacks.size === 0 && runRaf) {
      cancelAnimationFrame(runRaf)
      runRaf = 0
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COUPLING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export type CouplingTarget = HTMLElement | { current: HTMLElement | null }

const resolve = (t: CouplingTarget): HTMLElement | null =>
  t instanceof HTMLElement ? t : t.current

/**
 * Couple smoothed scroll velocity (signed [-1, 1]) onto a CSS custom property.
 *
 *   coupleVelocityNorm(el, "--skew", 4, "deg")
 *   → el.style.setProperty("--skew", `${vNorm * 4}deg`) every frame.
 */
export const coupleVelocityNorm = (
  target: CouplingTarget,
  cssVar: string,
  multiplier: number,
  unit: string = "",
): Cleanup =>
  registerFrame(() => {
    const el = resolve(target)
    if (!el) return
    const v = velocityBus.get().normalized
    el.style.setProperty(cssVar, `${(v * multiplier).toFixed(3)}${unit}`)
  })

/**
 * Couple velocity intensity ([0, 1]) onto a CSS custom property.
 *
 *   coupleVelocityIntensity(el, "--stretch", 0.12)
 *   → el.style.setProperty("--stretch", `${1 + intensity * 0.12}`)
 *
 * The base value defaults to 0; pass `base=1` for "stretch from rest=1".
 */
export const coupleVelocityIntensity = (
  target: CouplingTarget,
  cssVar: string,
  multiplier: number,
  unit: string = "",
  base: number = 0,
): Cleanup =>
  registerFrame(() => {
    const el = resolve(target)
    if (!el) return
    const i = velocityBus.get().intensity
    el.style.setProperty(cssVar, `${(base + i * multiplier).toFixed(3)}${unit}`)
  })

/**
 * Couple scroll depth (scrollY / innerHeight) onto a CSS custom property.
 * Useful for parallax floors that should NEVER touch React.
 */
export const coupleScrollDepth = (
  target: CouplingTarget,
  cssVar: string,
  multiplier: number,
  unit: string = "",
): Cleanup =>
  registerFrame(() => {
    const el = resolve(target)
    if (!el) return
    const d = coreStateBus.get().depth
    el.style.setProperty(cssVar, `${(d * multiplier).toFixed(3)}${unit}`)
  })

/**
 * Spring-coupled velocity → CSS var. Same as coupleVelocityNorm but the
 * value is filtered through an asymmetric spring (cast-iron by default)
 * so the output exhibits attack/recovery character — ideal for visual
 * masses that should "ring" after a scroll burst.
 */
export const coupleSpringVelocity = (
  target: CouplingTarget,
  cssVar: string,
  multiplier: number,
  unit: string = "",
  springCfg: SpringConfig = springs.castIron,
): Cleanup => {
  const s: SpringState = { pos: 0, vel: 0 }
  return registerFrame((_now, dt) => {
    const el = resolve(target)
    if (!el) return
    const v = velocityBus.get().normalized
    stepSpring(s, v * multiplier, dt, springCfg)
    el.style.setProperty(cssVar, `${s.pos.toFixed(3)}${unit}`)
  })
}

/**
 * Subscribe to a SLICE of the core-state-bus (e.g. just the section index
 * or hover state) and run a side-effect when that slice changes.
 *
 *   coupleCoreSlice(s => s.section, (section) => updateNav(section))
 *
 * The compare-and-skip logic is handled here so callers don't have to
 * track their own previous values.
 */
export const coupleCoreSlice = <T,>(
  selector: (s: CoreState) => T,
  effect: (value: T, prev: T | undefined) => void,
): Cleanup => {
  let prev: T | undefined
  const initial = selector(coreStateBus.get())
  effect(initial, undefined)
  prev = initial

  return coreStateBus.subscribe((s) => {
    const next = selector(s)
    if (next !== prev) {
      const before = prev
      prev = next
      effect(next, before)
    }
  })
}

/**
 * Combine many cleanups into one. Common pattern when a component sets up
 * multiple couplings in a single useEffect.
 */
export const compose = (...cleanups: Cleanup[]): Cleanup =>
  () => cleanups.forEach((c) => c())
