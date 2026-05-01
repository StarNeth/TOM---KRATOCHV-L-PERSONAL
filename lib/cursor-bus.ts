/**
 * cursor-bus.ts — SSR-safe module-level channel between cursor.tsx and
 * the WebGL shader in scene.tsx.
 *
 * Why a standalone file?
 *   cursor.tsx is statically imported from app/layout.tsx (it renders on
 *   every page, including /work/[id]). If cursor.tsx imports from
 *   components/webgl/scene.tsx, then `three`, `@react-three/fiber` and
 *   `@react-three/postprocessing` get pulled into the SSR module graph
 *   — and postprocessing touches `window` at module init, crashing the
 *   server render. Hoisting the bus to a dependency-free lib module
 *   cuts that chain while keeping the shared-state contract identical.
 *
 * All DOM access (`window.innerWidth`, etc.) lives inside `writePixel`,
 * which is only invoked at runtime from `cursor.tsx` inside `useEffect`
 * — so this file is safe to import from any server component too.
 */

export type CursorState = {
  /** normalized device coords, x in [-1, 1] (aspect applied in shader) */
  x: number
  /** normalized device coords, y in [-1, 1] */
  y: number
  /** smoothed dx/frame in normalized space */
  vx: number
  /** smoothed dy/frame in normalized space */
  vy: number
  /** 0..1 motion energy, decays ~0.86/frame when idle (decay lives in shader uniform tick) */
  energy: number
}

const state: CursorState = { x: 0, y: 0, vx: 0, vy: 0, energy: 0 }

export const cursorBus = {
  get: (): CursorState => state,

  /** Pixel-space write from cursor.tsx — normalizes internally. */
  writePixel(px: number, py: number, normSpd: number) {
    if (typeof window === "undefined") return
    const nx = (px / window.innerWidth) * 2 - 1
    const ny = -(py / window.innerHeight) * 2 + 1
    const dx = nx - state.x
    const dy = ny - state.y
    // Low-pass smoothing — hides pointer jitter without deadening motion.
    state.vx = state.vx * 0.72 + dx * 0.28
    state.vy = state.vy * 0.72 + dy * 0.28
    const mag = Math.hypot(dx, dy)
    state.energy = Math.min(1, state.energy + mag * 6)
    state.x = nx
    state.y = ny
  },
}
