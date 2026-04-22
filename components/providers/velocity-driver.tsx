// components/providers/velocity-driver.tsx
"use client"

import { useEffect, useRef } from "react"
import { scrollStore } from "@/components/providers/lenis-provider"
import { velocityBus } from "@/lib/velocity-bus"

/**
 * Single source of motion truth. Reads Lenis's pre-smoothed scrollStore
 * on every frame and pushes into the shared velocity bus. Hero, Scene,
 * and Capabilities all subscribe downstream.
 */
export const VelocityDriver = () => {
  const rafId = useRef(0)

  useEffect(() => {
    const tick = () => {
      // scrollStore.velocity is already smoothed in lenis-provider (0.85/0.15).
      // scrollStore.progress is 0..1 straight from Lenis.
      velocityBus.set(scrollStore.velocity, scrollStore.progress)
      // Continuous decay ensures intensity relaxes to 0 when scroll stops,
      // even if Lenis keeps firing micro-updates at 0 velocity.
      velocityBus.decay()
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId.current)
  }, [])

  return null
}