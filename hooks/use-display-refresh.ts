"use client"

import { useEffect, useState } from "react"

/**
 * useDisplayRefresh — measures the actual rAF refresh rate.
 *
 *  • Most desktops/iPads: 60Hz. ProMotion: 120Hz. Some laptops: 90Hz / 144Hz.
 *  • Linux Wayland with VRR can drift continuously.
 *
 * Rather than guess, we sample the first 30 rAF deltas and emit a stable
 * estimate. The resulting `hz` is a dependency-stable number (we round to
 * the nearest 5 Hz so trivial sub-millisecond jitter doesn't churn React).
 *
 * SSR-safe: returns 60 / dt60 until the browser actually starts ticking.
 */
export type DisplayRefresh = {
  /** Refresh rate in Hz, rounded to nearest 5. Always 60 on the server. */
  hz: number
  /** Average frame delta in seconds, derived from hz. */
  dt: number
  /** True once at least one valid sample has been collected. */
  measured: boolean
}

const DEFAULT: DisplayRefresh = { hz: 60, dt: 1 / 60, measured: false }

const SAMPLE_FRAMES = 30

export const useDisplayRefresh = (): DisplayRefresh => {
  const [info, setInfo] = useState<DisplayRefresh>(DEFAULT)

  useEffect(() => {
    if (typeof window === "undefined") return

    const samples: number[] = []
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const delta = now - last
      last = now
      // Skip impossible frames (tab switch, debugger pause).
      if (delta > 4 && delta < 100) samples.push(delta)
      if (samples.length >= SAMPLE_FRAMES) {
        // Median is more robust against single-frame outliers than mean.
        const sorted = [...samples].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        const rawHz  = 1000 / median
        // Snap to nearest 5Hz — keeps state stable across micro-jitter.
        const hz = Math.max(30, Math.min(240, Math.round(rawHz / 5) * 5))
        setInfo({ hz, dt: 1 / hz, measured: true })
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return info
}
