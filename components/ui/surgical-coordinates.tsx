'use client'

import { useState, useEffect, useCallback } from 'react'

export function SurgicalCoordinates() {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 })
  const [hex, setHex] = useState('000000')

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Normalize to viewport percentages
    const x = Math.round((e.clientX / window.innerWidth) * 100)
    const y = Math.round((e.clientY / window.innerHeight) * 100)
    
    setCoordinates({ x, y })

    // Generate hex based on position
    const r = Math.round((e.clientX / window.innerWidth) * 255)
    const g = Math.round((e.clientY / window.innerHeight) * 255)
    const b = Math.round(((e.clientX + e.clientY) / (window.innerWidth + window.innerHeight)) * 255)
    
    setHex(
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0')
    )
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-50 flex flex-col gap-1 mix-blend-difference">
      {/* Coordinates */}
      <div className="coordinates flex items-center gap-3">
        <span className="text-white/30">X</span>
        <span className="text-white">{String(coordinates.x).padStart(3, '0')}</span>
        <span className="text-white/20">/</span>
        <span className="text-white/30">Y</span>
        <span className="text-white">{String(coordinates.y).padStart(3, '0')}</span>
      </div>

      {/* Hex Code */}
      <div className="coordinates flex items-center gap-2">
        <span className="text-white/30">#</span>
        <span className="text-white uppercase">{hex}</span>
      </div>

      {/* Decorative crosshair */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-[1px] w-4 bg-white/20" />
        <div className="h-1 w-1 bg-surgical-red" />
        <div className="h-[1px] w-4 bg-white/20" />
      </div>
    </div>
  )
}
