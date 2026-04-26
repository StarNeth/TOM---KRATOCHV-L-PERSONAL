// hooks/use-display-refresh.ts
// ─────────────────────────────────────────────────────────────────────────
// Detect the display refresh rate by sampling rAF intervals over ~40 frames.
// Result is rounded to the nearest standard rate (60, 75, 90, 120, 144, 165,
// 240). Falls back to 60Hz if detection fails. The detected rate is also
// pushed into the global motion module so dur.*() returns the right ms.
// ─────────────────────────────────────────────────────────────────────────

"use client"

import { useEffect, useState } from "react"
import { setDisplayRefresh } from "@/lib/motion"

const STANDARD_RATES = [60, 75, 90, 120, 144, 165, 240]

const snap = (hz: number): number => {
  let best = STANDARD_RATES[0]
  let bestDist = Math.abs(hz - best)
  for (const r of STANDARD_RATES) {
    const d = Math.abs(hz - r)
    if (d < bestDist) {
      best = r
      bestDist = d
    }
  }
  return best
}

export const useDisplayRefresh = (): number => {
  const [hz, setHz] = useState<number>(60)

  useEffect(() => {
    if (typeof window === "undefined") return
    let frames = 0
    const samples: number[] = []
    let last = performance.now()
    let raf = 0
    let alive = true

    const tick = (now: number) => {
      if (!alive) return
      const dt = now - last
      last = now
      if (frames > 2 && dt > 0) samples.push(1000 / dt)
      frames++
      if (frames < 42) {
        raf = requestAnimationFrame(tick)
      } else {
        // Median to reject outliers.
        samples.sort((a, b) => a - b)
        const median = samples[Math.floor(samples.length / 2)] ?? 60
        const snapped = snap(median)
        setHz(snapped)
        setDisplayRefresh(snapped)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return hz
}
