"use client"

// components/providers/instrument-driver.tsx
// ─────────────────────────────────────────────────────────────────────────
// Boots the GPU→DOM telemetry smoother and structural coupling on mount.
// Also activates display-refresh detection so dur.* utilities scale.
// One mount, one rAF for the smoother, one rAF for coupling. All aria-
// hidden — this component renders nothing.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect } from "react"
import { startCoreStateBus, stopCoreStateBus } from "@/lib/core-state-bus"
import {
  startStructuralCoupling,
  stopStructuralCoupling,
} from "@/lib/structural-coupling"
import { useDisplayRefresh } from "@/hooks/use-display-refresh"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export const InstrumentDriver = (): null => {
  // Activate refresh detection (writes to motion.ts global on completion).
  useDisplayRefresh()
  const reduced = useReducedMotion()

  useEffect(() => {
    startCoreStateBus()
    if (!reduced) startStructuralCoupling()
    return () => {
      stopCoreStateBus()
      stopStructuralCoupling()
    }
  }, [reduced])

  return null
}
