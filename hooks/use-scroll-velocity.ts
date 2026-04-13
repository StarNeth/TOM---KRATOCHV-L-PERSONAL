'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

export function useScrollVelocity() {
  const [velocity, setVelocity] = useState(0)
  const lastScrollY = useRef(0)
  const lastTime = useRef(Date.now())
  const rafId = useRef<number>(0)

  const updateVelocity = useCallback(() => {
    const currentScrollY = window.scrollY
    const currentTime = Date.now()
    const deltaY = currentScrollY - lastScrollY.current
    const deltaTime = currentTime - lastTime.current

    if (deltaTime > 0) {
      const newVelocity = deltaY / deltaTime
      setVelocity(newVelocity)
    }

    lastScrollY.current = currentScrollY
    lastTime.current = currentTime

    // Decay velocity when not scrolling
    rafId.current = requestAnimationFrame(() => {
      setVelocity((v) => v * 0.95)
    })
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      cancelAnimationFrame(rafId.current)
      updateVelocity()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      cancelAnimationFrame(rafId.current)
    }
  }, [updateVelocity])

  return velocity
}
