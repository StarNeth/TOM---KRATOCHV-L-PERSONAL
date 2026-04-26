/**
 * Isolation test for the scroll-camera bus.
 *
 * Run:
 *   node --experimental-strip-types scripts/test-scroll-camera.ts
 * (Node ≥22 with --experimental-strip-types, or Node ≥24 by default.)
 *
 * Exercises:
 *   1. updateScrollCamera(progress) sets targetZ on the linear ramp
 *      0 → -6 across progress 0..1.
 *   2. stepScrollCamera(dt) eases currentZ toward targetZ such that,
 *      after 60 iterations of dt=0.016 (≈1 second), currentZ is within
 *      0.01 of targetZ.
 */

import {
  scrollCameraBus,
  updateScrollCamera,
  stepScrollCamera,
} from "../lib/scroll-camera-bus.ts"

let failures = 0
const approx = (a: number, b: number, eps = 1e-6): boolean =>
  Math.abs(a - b) <= eps

function expect(label: string, actual: number, expected: number, eps = 1e-6): void {
  const ok = approx(actual, expected, eps)
  const status = ok ? "PASS" : "FAIL"
  console.log(
    `[v0] ${status}  ${label}  actual=${actual.toFixed(6)}  expected=${expected.toFixed(6)}  eps=${eps}`,
  )
  if (!ok) failures += 1
}

// ── 1. targetZ map ──────────────────────────────────────────────────
console.log("[v0] --- updateScrollCamera target mapping ---")

updateScrollCamera(0)
expect("progress=0    → targetZ", scrollCameraBus.targetZ, 0)

updateScrollCamera(0.5)
expect("progress=0.5  → targetZ", scrollCameraBus.targetZ, -3.0)

updateScrollCamera(1)
expect("progress=1    → targetZ", scrollCameraBus.targetZ, -6.0)

// Edge cases — clamping
updateScrollCamera(-0.5)
expect("progress=-0.5 → targetZ (clamped)", scrollCameraBus.targetZ, 0)

updateScrollCamera(2)
expect("progress=2    → targetZ (clamped)", scrollCameraBus.targetZ, -6.0)

// ── 2. stepScrollCamera convergence ────────────────────────────────
console.log("[v0] --- stepScrollCamera convergence (60 frames @ dt=0.016) ---")

// Reset bus to a known state, then drive currentZ → targetZ over 1 s.
scrollCameraBus.currentZ = 0
updateScrollCamera(1) // targetZ = -6.0
console.log(
  `[v0] start  currentZ=${scrollCameraBus.currentZ.toFixed(6)}  targetZ=${scrollCameraBus.targetZ.toFixed(6)}`,
)

const dt = 0.016
for (let i = 1; i <= 60; i += 1) {
  stepScrollCamera(dt)
  if (i % 10 === 0) {
    console.log(
      `[v0] frame ${String(i).padStart(2, " ")}  currentZ=${scrollCameraBus.currentZ.toFixed(6)}  delta=${(scrollCameraBus.currentZ - scrollCameraBus.targetZ).toFixed(6)}`,
    )
  }
}

expect(
  "after 60 frames currentZ ≈ targetZ",
  scrollCameraBus.currentZ,
  scrollCameraBus.targetZ,
  0.01,
)

// ── Result ─────────────────────────────────────────────────────────
console.log(
  failures === 0
    ? "[v0] all assertions passed"
    : `[v0] ${failures} assertion(s) failed`,
)
process.exit(failures === 0 ? 0 : 1)
