// hooks/use-reduced-motion.ts
"use client"

import { useEffect, useState } from "react"

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return reduced
}
