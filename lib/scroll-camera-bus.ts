// lib/scroll-camera-bus.ts
//
// Maps browser scroll progress to WebGL camera Z position. Pure math:
// no React, no DOM events, no zustand. The projects rail consumes the
// dolly through useFrame — refs only, never state — so this stays a
// flat module-scoped object that anyone can read and exactly two
// functions that anyone can call.
//
// updateScrollCamera() is driven from a single ScrollTrigger on the
// projects section; stepScrollCamera(dt) is called every frame from
// the camera controller and integrates a critically-damped spring
// toward the target. Same exponential-decay analytical step we use
// elsewhere in the project — frame-rate independent, never overshoots.

export interface ScrollCameraBus {
  /** Where the camera wants to be on the Z axis (world units, negative = forward). */
  targetZ: number
  /** Smoothed current Z, integrated each frame by stepScrollCamera. */
  currentZ: number
  /** Floor of (progress * CARD_COUNT). Which card is "active" right now. */
  cardIndex: number
  /** Normalized 0..1 progress through the entire rail. */
  progress: number
}

export const scrollCameraBus: ScrollCameraBus = {
  targetZ: 0,
  currentZ: 0,
  cardIndex: 0,
  progress: 0,
}

/** World-space distance between adjacent cards along Z. */
export const CARD_SPACING = 6.0
/** Number of project cards on the rail. Keep in sync with the projects array. */
export const CARD_COUNT = 2

/**
 * Push a new normalized scroll progress (0..1) through the projects
 * section into the bus. Recomputes targetZ / cardIndex / progress.
 * Call this from a ScrollTrigger onUpdate, never from useFrame.
 */
export function updateScrollCamera(scrollProgress: number): void {
  // Total rail length: from card 0 at z=0 to card N-1 at z = -SPACING*(N-1).
  // With CARD_COUNT=2 and SPACING=6.0 that's a 6.0-unit dolly, matching
  // the test spec: progress=0.5 -> targetZ = -3.0, progress=1 -> -6.0.
  const totalTravel = CARD_SPACING * (CARD_COUNT - 1)
  scrollCameraBus.targetZ = -(scrollProgress * totalTravel)
  scrollCameraBus.progress = scrollProgress
  scrollCameraBus.cardIndex = Math.floor(scrollProgress * CARD_COUNT)
}

/**
 * Integrate currentZ toward targetZ using an exact exponential-decay
 * step. Frame-rate independent — call once per frame from useFrame
 * with the renderer's delta time in seconds.
 *
 * b is the decay constant; higher = snappier. b=16 gives a ~62ms
 * time-to-63%-of-error response, which feels cinematic without
 * looking laggy. We deliberately do NOT mix in a stiffness term:
 * pure first-order decay can never overshoot, which is exactly what
 * a dolly needs.
 */
export function stepScrollCamera(dt: number): void {
  const error = scrollCameraBus.targetZ - scrollCameraBus.currentZ
  const b = 16
  // 1 - e^(-b*dt) is the closed-form fraction of the remaining error
  // we should consume this frame. Stable for any dt, including the
  // huge dt you get on the first frame after a tab regains focus.
  scrollCameraBus.currentZ += error * (1 - Math.exp(-b * dt))
}
