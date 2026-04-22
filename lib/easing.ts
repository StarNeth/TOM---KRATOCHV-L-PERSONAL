// lib/easing.ts
// Four named curves. Strings are parsed natively by GSAP 3.12+.
// No CustomEase registration needed — eliminates plugin/load-order risk.

export const ease = {
  // Silk — entrances, reveals, things arriving into place
  silk: "cubic-bezier(0.22, 1, 0.36, 1)",
  // Mechanical — UI snaps, toggles, authoritative commits
  mechanical: "cubic-bezier(0.76, 0, 0.24, 1)",
  // Ballistic — overshoot with controlled landing (replaces elastic)
  ballistic: "cubic-bezier(0.16, 1.11, 0.3, 1)",
  // Decay — exits, dissolves, things leaving
  decay: "cubic-bezier(0.33, 1, 0.68, 1)",
} as const

// CSS-facing aliases for transitions that live in CSS land.
export const cssEase = {
  silk: "cubic-bezier(0.22, 1, 0.36, 1)",
  mechanical: "cubic-bezier(0.76, 0, 0.24, 1)",
  decay: "cubic-bezier(0.33, 1, 0.68, 1)",
} as const