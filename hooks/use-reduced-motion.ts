"use client"

import { useEffect, useState } from "react"

/**
 * useReducedMotion — honors `prefers-reduced-motion: reduce`.
 *
 *  Returns `true` when the user has the OS-level reduced-motion flag set.
 *  Listens for changes (some OSes expose a toggle without reloading).
 *
 *  SSR returns `false` so animations remain in the server-rendered HTML.
 *  The component opts back into still UI on the client when this flips.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mql.matches)
    sync()
    if (mql.addEventListener) mql.addEventListener("change", sync)
    else mql.addListener(sync)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", sync)
      else mql.removeListener(sync)
    }
  }, [])

  return reduced
}
