"use client"

import { useEffect, useRef, useState } from "react"

export const Cursor = () => {
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null) // Změněno z crossRef

  useEffect(() => {
    // Render cursor strictly after hydration to prevent Next.js mismatches
    if (typeof window !== "undefined" && window.innerWidth >= 768 && window.matchMedia("(pointer: fine)").matches) {
      setMounted(true)
    }
  }, [])

  useEffect(() => {
    if (!mounted || !rootRef.current || !ringRef.current || !dotRef.current) return

    const root = rootRef.current
    const ring = ringRef.current
    const dot = dotRef.current

    // Force hide native cursor globally
    const style = document.createElement("style")
    style.textContent = `* { cursor: none !important; }`
    document.head.appendChild(style)

    // Position tracking
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let mainX = targetX
    let mainY = targetY
    let trailX = targetX
    let trailY = targetY

    let isHover = false
    let isDown = false
    let rafId = 0

    // Hardware-accelerated DOM mutation
    const render = () => {
      mainX += (targetX - mainX) * 0.45 
      mainY += (targetY - mainY) * 0.45
      trailX += (targetX - trailX) * 0.15 
      trailY += (targetY - trailY) * 0.15

      root.style.transform = `translate3d(${mainX}px, ${mainY}px, 0)`
      
      const dx = trailX - mainX
      const dy = trailY - mainY
      
      // Calculate states
      const ringScale = isHover ? 1.8 : isDown ? 0.7 : 1
      const dotScale = isHover ? 1.5 : isDown ? 0.7 : 1 // Dot se trochu zvětší na odkazu

      ring.style.transform = `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(${ringScale})`
      dot.style.transform = `translate(-50%, -50%) scale(${dotScale})` // Odstraněna rotace
      
      ring.style.borderColor = isHover ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.4)"

      rafId = requestAnimationFrame(render)
    }

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    const onPointerDown = () => { isDown = true }
    const onPointerUp = () => { isDown = false }

    const CLICKABLE_SELECTORS = "a, button, [role='button'], input, textarea, select, [data-cursor='hover']"
    
    const onPointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      isHover = !!target?.closest(CLICKABLE_SELECTORS)
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    window.addEventListener("pointerover", onPointerOver, { passive: true })

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointerover", onPointerOver)
      if (style.parentNode) style.parentNode.removeChild(style)
    }
  }, [mounted])

  if (!mounted) return null

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="fixed top-0 left-0 pointer-events-none"
      style={{
        zIndex: 999999, // Guarantee top layer
        isolation: "isolate",
        willChange: "transform"
      }}
    >
      {/* Outer Ring */}
      <div
        ref={ringRef}
        className="absolute top-0 left-0 rounded-full"
        style={{
          width: "26px",
          height: "26px",
          border: "1px solid rgba(255,255,255,0.4)",
          willChange: "transform",
          transition: "border-color 0.2s ease-out",
          boxShadow: "0 0 10px rgba(0,0,0,0.5)"
        }}
      />
      {/* Inner Dot (Nahradilo Crosshair) */}
      <div
        ref={dotRef}
        className="absolute top-0 left-0 bg-white rounded-full"
        style={{
          width: "8px", 
          height: "8px",
          willChange: "transform",
          // ZMĚNĚNO: Používáme boxShadow místo filter. 
          // Browser to teď nevyrastruje jako obrázek, ale udrží to jako vektor. Zůstane 100% ostrý.
          boxShadow: "0 2px 4px rgba(0,0,0,0.8)"
        }}
      />
    </div>
  )
}