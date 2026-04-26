/**
 * core-state-bus.ts — Cross-mesh state channel for the WebGL hero.
 *
 * Required by components/webgl/HeroText.tsx (directive Tier 2).
 *
 * `turbulence` is the velocity-driven 0..1 burst already computed inside
 * scene.tsx (`turbulenceRef.current.value`). scene.tsx mirrors the value
 * into this bus once per frame so HeroText can read the EXACT same signal
 * the fluid plane sees, without recomputing it.
 *
 * `intensity` is a live getter onto cursorBus.energy — keeping it as a
 * getter avoids stale snapshots and keeps this module dependency-light
 * (no zustand subscriber, no useFrame ownership).
 *
 * Read-only contract for consumers (HeroText). The only writer is
 * scene.tsx's LiquidObsidian useFrame loop (single line, see scene.tsx).
 */

import { cursorBus } from "./cursor-bus"

export const coreStateBus = {
  /** Velocity-driven turbulence burst, 0..1. Mirrored from scene.tsx. */
  turbulence: 0,

  /** Live cursor motion energy, 0..1. Decays in scene.tsx each frame. */
  get intensity(): number {
    return cursorBus.get().energy
  },
}
