/**
 * lib/motion.ts — single source of motion truth.
 *
 * The codebase already has lib/easing.ts (four named cubic-bezier curves).
 * This file extends — not replaces — that module by adding:
 *
 *   1. Named DURATION tokens (so 240/400/700/1200ms aren't sprinkled raw
 *      across components).
 *   2. Named SPRING presets (cast-iron asymmetric — the same physics
 *      currently inlined in projects.tsx, hoisted here so other surfaces
 *      can borrow it).
 *   3. REFRESH-AWARE LERP — a tiny utility that converts a "60Hz target
 *      coefficient" into a frame-rate-independent decay constant. Cursor.tsx
 *      already does this manually; this exposes it as a callable so other
 *      rAF loops (hero, projects, capabilities) can adopt the same model
 *      without re-deriving it.
 *
 * Why this layering: existing components import { ease } from "@/lib/easing".
 * That module continues to work unchanged. This module re-exports `ease` as
 * a convenience so new code can import everything motion-related from one
 * place (`import { ease, dur, spring, lerpDecay } from "@/lib/motion"`).
 */

export { ease, cssEase } from "./easing"

// ─────────────────────────────────────────────────────────────────────────────
// DURATIONS — named, in milliseconds. Choose by SEMANTIC meaning, not "feel."
// ─────────────────────────────────────────────────────────────────────────────
//   instant : sub-perceptual UI reaction (toggle states, hover snap)
//   tap     : button presses, scramble lock-in
//   beat    : standard transition, modal in/out
//   bar     : full reveals, masked text, hero entrance staggers
//   long    : scene transitions, slow zooms, dread builds
//   epic    : preloader acts, hero name reveal cascade
// ─────────────────────────────────────────────────────────────────────────────
export const dur = {
  instant: 120,
  tap:     240,
  beat:    400,
  bar:     700,
  long:    1200,
  epic:    1800,
} as const

export type DurationKey = keyof typeof dur

// As-seconds (GSAP eats seconds, not ms — most animation calls need this form).
export const durS = Object.fromEntries(
  Object.entries(dur).map(([k, v]) => [k, v / 1000]),
) as Record<DurationKey, number>

// ─────────────────────────────────────────────────────────────────────────────
// SPRING PRESETS — asymmetric (different damping for attack vs recovery).
// k = stiffness, b = damping, m implicit = 1. ζ = b / (2·√k).
//
//   castIron     : ζ_attack ≈ 1.40 (overdamped) / ζ_rec ≈ 0.22 (under-damped)
//                  Cast iron meeting cast iron. Used by projects.tsx for the
//                  rotateY/skewX channels — firm engagement, magnetic ringing.
//
//   castIronXL   : Same ratios on a stiffer spine. Bigger visual masses
//                  (huge background words, hero name) need more restoring
//                  force or they feel wobbly.
//
//   gentle       : Symmetric, ζ ≈ 0.85. Default for any "single-channel"
//                  spring where overshoot ringing isn't desired (HUD numbers,
//                  small lerps). Equivalent to a clean exponential decay.
//
// Usage with stepSpring() below:
//   stepSpring(state, target, dt, spring.castIron)
// ─────────────────────────────────────────────────────────────────────────────
export interface SpringConfig {
  kAccel: number
  kRec:   number
  bAccel: number
  bRec:   number
}

export const spring = {
  castIron: {
    kAccel: 380,
    kRec:    45,
    bAccel:  55,
    bRec:    3.0,
  },
  castIronXL: {
    kAccel: 520,
    kRec:    68,
    bAccel:  72,
    bRec:    3.8,
  },
  gentle: {
    kAccel: 180,
    kRec:   180,
    bAccel:  24,
    bRec:    24,
  },
} as const satisfies Record<string, SpringConfig>

export type SpringPreset = keyof typeof spring

export interface SpringState {
  pos: number
  vel: number
}

/**
 * Single integration step on an asymmetric spring.
 *
 *   Velocity update is NEWTONIAN (v += a·dt), but damping is applied as an
 *   EXACT EXPONENTIAL DECAY (v *= exp(-b·dt)). This makes the spring
 *   framerate-independent: identical perceptual feel at 60Hz, 120Hz, 144Hz.
 *
 *   Regime detection is velocity-signed (sign(error) === sign(vel) → still
 *   accelerating; otherwise → recovering after overshoot). The channel
 *   correctly enters RECOVERY at the zero-crossing, not one frame late.
 *
 * @param s       Mutable spring state (pos + vel). Pos returned for convenience.
 * @param target  Where the mass wants to settle.
 * @param dt      Frame delta in SECONDS (NOT ms — convert at the call site).
 * @param cfg     Spring preset. Defaults to `spring.castIron`.
 */
export const stepSpring = (
  s: SpringState,
  target: number,
  dt: number,
  cfg: SpringConfig = spring.castIron,
): number => {
  const error = target - s.pos
  const accelerating = Math.sign(error) === Math.sign(s.vel) || Math.abs(s.vel) < 1e-3
  const k = accelerating ? cfg.kAccel : cfg.kRec
  const b = accelerating ? cfg.bAccel : cfg.bRec

  s.vel += k * error * dt
  s.vel *= Math.exp(-b * dt)
  s.pos += s.vel * dt
  return s.pos
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH-AWARE LERP
//
// `x += (target - x) * k` is the wrong primitive whenever rAF can fire at
// rates other than 60Hz: at 120Hz the coefficient effectively doubles.
//
// `x += (target - x) * (1 - exp(-λ·dt))` is the analytical solution to the
// continuous follow ODE dx/dt = -λ·(x - target). λ has units of 1/seconds —
// the rate at which the system converges, independent of how rAF fires.
//
// Calibration: a legacy 60Hz coefficient k corresponds to λ ≈ -ln(1-k) / dt60
// where dt60 = 1/60. So k=0.18 → λ ≈ 11.9, k=0.32 → λ ≈ 23.1.
//
//   lambdaFromCoeff60(0.18) ≈ 11.9
//   lambdaFromCoeff60(0.32) ≈ 23.1
//
// Use:
//   const decay = 1 - Math.exp(-LAMBDA * dt)   // dt in seconds
//   x += (target - x) * decay
// ─────────────────────────────────────────────────────────────────────────────
export const lambdaFromCoeff60 = (k60: number): number => {
  const clamped = Math.min(0.999, Math.max(1e-4, k60))
  return -Math.log(1 - clamped) * 60
}

/**
 * Frame-rate-independent decay coefficient for a follow lerp.
 * @param lambda  Convergence rate in 1/seconds (use lambdaFromCoeff60 to derive).
 * @param dt      Frame delta in seconds.
 */
export const lerpDecay = (lambda: number, dt: number): number =>
  1 - Math.exp(-lambda * dt)
