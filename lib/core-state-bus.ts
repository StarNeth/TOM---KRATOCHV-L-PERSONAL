// lib/core-state-bus.ts
// ─────────────────────────────────────────────────────────────────────────
// THE GPU → DOM TELEMETRY CHANNEL
//
// A single mutable object, written by the WebGL scene's useFrame loop and
// polled by DOM consumers via rAF. React cannot observe it. That is the
// point: this is the channel through which fluid physics drives the layout
// without ever touching React state.
//
// Writers (in scene.tsx, useFrame): turbulence, intensity, energy, frame.
// Readers (frame-system, telemetry-panel, structural-coupling, hero):
//   read fields directly. Never mutate.
//
// `energySmooth` is a one-pole low-pass of `energy` with τ ≈ 220ms,
// updated here in a self-running rAF so consumers don't each re-derive it.
// ─────────────────────────────────────────────────────────────────────────

export type CoreState = {
  /** Raw turbulence burst level [0..1], driven by velocity threshold crossings. */
  turbulence: number
  /** Smoothed |normalized velocity| [0..1] from the velocity bus. */
  intensity: number
  /** Composite system energy [0..1] — the public single number. */
  energy: number
  /** Low-pass smoothed energy [0..1], τ ≈ 220ms. Use for layout coupling. */
  energySmooth: number
  /** Monotonic frame counter incremented on every scene tick. */
  frame: number
}

export const coreStateBus: CoreState = {
  turbulence: 0,
  intensity: 0,
  energy: 0,
  energySmooth: 0,
  frame: 0,
}

// ─── Internal smoother ──────────────────────────────────────────────────
// We run a single global rAF that keeps energySmooth tracking energy.
// τ ≈ 220ms → coefficient k = 1 - exp(-dt/τ).
let _started = false
let _last = 0
let _raf = 0

const _tick = (now: number) => {
  const dt = _last === 0 ? 0.016 : Math.min(0.05, (now - _last) / 1000)
  _last = now
  const tau = 0.22
  const k = 1 - Math.exp(-dt / tau)
  coreStateBus.energySmooth += (coreStateBus.energy - coreStateBus.energySmooth) * k
  _raf = requestAnimationFrame(_tick)
}

export const startCoreStateBus = (): void => {
  if (_started || typeof window === "undefined") return
  _started = true
  _last = 0
  _raf = requestAnimationFrame(_tick)
}

export const stopCoreStateBus = (): void => {
  if (!_started) return
  _started = false
  cancelAnimationFrame(_raf)
}
