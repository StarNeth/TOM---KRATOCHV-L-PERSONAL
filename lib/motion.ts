// lib/motion.ts
// ─────────────────────────────────────────────────────────────────────────
// REFRESH-RATE-SCALED TIMING
//
// All motion in the system uses these helpers instead of hardcoded ms.
// The duration is expressed in 60Hz frames; we convert to ms on demand
// using the latest detected display refresh rate. A 36-frame transition
// (600ms @ 60Hz) becomes 300ms @ 120Hz — the eye perceives the same speed
// because the speed is anchored to frames, not wall time.
// ─────────────────────────────────────────────────────────────────────────

let _refreshHz = 60

export const setDisplayRefresh = (hz: number): void => {
  if (hz > 0 && Number.isFinite(hz)) _refreshHz = hz
}

export const getDisplayRefresh = (): number => _refreshHz

const ms = (frames60: number): number => Math.round((frames60 / 60) * (60 / _refreshHz) * 1000)

/** Frame-anchored durations. Multiply by 1 to use; values are ms. */
export const dur = {
  /** ~80ms @ 60Hz — for instant micro-feedback. */
  instant: (): number => ms(5),
  /** ~160ms @ 60Hz — precision interaction retract. */
  retract: (): number => ms(10),
  /** ~240ms @ 60Hz — precision interaction enter (line draw). */
  enter: (): number => ms(14),
  /** ~400ms @ 60Hz — short reveal. */
  reveal: (): number => ms(24),
  /** ~600ms @ 60Hz — standard reveal. */
  full: (): number => ms(36),
  /** ~900ms @ 60Hz — luxurious reveal for major entries. */
  grand: (): number => ms(54),
  /** ~1800ms @ 60Hz — the project card scan. */
  scan: (): number => ms(108),
}

/** Cubic-bezier easings used everywhere. Names anchored to physical metaphor. */
export const ease = {
  /** Hard mechanical seat — "expo.out" cousin. Use for line draws. */
  expoOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** Smoothest possible — silk. Use for reveals of monumental type. */
  silk: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Symmetric mechanical — power1.inOut. Use for scan lines. */
  mechanical: "cubic-bezier(0.65, 0, 0.35, 1)",
  /** power1.out — for retract / leave. */
  retract: "cubic-bezier(0.33, 1, 0.68, 1)",
}
