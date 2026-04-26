// lib/structural-coupling.ts
// ─────────────────────────────────────────────────────────────────────────
// THE WHISPER
//
// energySmooth from coreStateBus drives a small set of CSS custom
// properties on documentElement. Layout geometry references these
// variables. The deltas are at the edge of the human perceptual threshold
// (~4px on 1440px) so the visitor cannot name what they notice — they
// feel the site is alive.
//
// One global rAF, no React, runs only when started. Cleaned up in
// the driver component on unmount or when prefers-reduced-motion flips on.
// ─────────────────────────────────────────────────────────────────────────

import { coreStateBus } from "./core-state-bus"

let _raf = 0
let _alive = false

const apply = (e: number, root: HTMLElement): void => {
  // e ∈ [0, 1]
  // Maxima per Section 5 spec.
  const navOffset = (e * 6).toFixed(2)               // ±6px
  const heroSubShift = (e * 4).toFixed(2)            // ±4px
  const specCompress = (-e * 4).toFixed(2)           // -4px
  const sectionGap = (-e * 8).toFixed(2)             // -8px
  const apertureExtra = (e * 8).toFixed(2)           // +8px
  // Frame opacity rises with energy: 0.10 → 0.28
  const frameOpacity = (0.10 + e * 0.18).toFixed(3)

  root.style.setProperty("--coupling-nav", `${navOffset}px`)
  root.style.setProperty("--coupling-hero-sub", `${heroSubShift}px`)
  root.style.setProperty("--coupling-spec", `${specCompress}px`)
  root.style.setProperty("--coupling-gap", `${sectionGap}px`)
  root.style.setProperty("--coupling-aperture", `${apertureExtra}px`)
  root.style.setProperty("--frame-opacity", frameOpacity)
  root.style.setProperty("--energy", e.toFixed(4))
}

export const startStructuralCoupling = (): void => {
  if (typeof document === "undefined" || _alive) return
  _alive = true
  const root = document.documentElement
  const tick = () => {
    if (!_alive) return
    apply(coreStateBus.energySmooth, root)
    _raf = requestAnimationFrame(tick)
  }
  _raf = requestAnimationFrame(tick)
}

export const stopStructuralCoupling = (): void => {
  _alive = false
  cancelAnimationFrame(_raf)
  if (typeof document !== "undefined") {
    const root = document.documentElement
    root.style.setProperty("--coupling-nav", "0px")
    root.style.setProperty("--coupling-hero-sub", "0px")
    root.style.setProperty("--coupling-spec", "0px")
    root.style.setProperty("--coupling-gap", "0px")
    root.style.setProperty("--coupling-aperture", "0px")
    root.style.setProperty("--frame-opacity", "0.10")
    root.style.setProperty("--energy", "0")
  }
}
