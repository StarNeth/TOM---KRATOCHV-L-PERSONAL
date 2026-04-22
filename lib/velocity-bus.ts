// lib/velocity-bus.ts
// One velocity signal, consumed by hero, scene, and capabilities.
// Ref-based reads via getState() — zero React re-renders.

import { create } from "zustand"

type VelocityState = {
  // Raw pixel delta per frame, signed. Positive = scrolling down.
  raw: number
  // Smoothed, normalized [-1, 1] for shader / visual consumption
  normalized: number
  // Absolute smoothed magnitude, useful for bloom / stretch
  intensity: number
  // Scroll progress [0, 1]
  progress: number
  setVelocity: (raw: number, progress: number) => void
  decay: () => void
}

const MAX_VELOCITY = 45 // px/frame we treat as "full throttle"
const SMOOTH = 0.12

export const useVelocityStore = create<VelocityState>((set, get) => ({
  raw: 0,
  normalized: 0,
  intensity: 0,
  progress: 0,
  setVelocity: (raw, progress) => {
    const clamped = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, raw))
    const targetNorm = clamped / MAX_VELOCITY
    const prev = get()
    const normalized = prev.normalized + (targetNorm - prev.normalized) * SMOOTH
    const intensity = prev.intensity + (Math.abs(targetNorm) - prev.intensity) * SMOOTH
    set({ raw: clamped, normalized, intensity, progress })
  },
  decay: () => {
    const prev = get()
    set({
      raw: prev.raw * 0.9,
      normalized: prev.normalized * 0.92,
      intensity: prev.intensity * 0.94,
    })
  },
}))

// Non-React accessor for hot paths (useFrame, rAF loops)
export const velocityBus = {
  get: () => useVelocityStore.getState(),
  set: useVelocityStore.getState().setVelocity,
  decay: useVelocityStore.getState().decay,
}