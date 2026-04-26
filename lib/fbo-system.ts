/**
 * lib/fbo-system.ts
 *
 * Ping-pong FBO infrastructure for GPU-resident state simulations.
 *
 * Two WebGLRenderTargets ("read" / "write") plus an in-place swap()
 * that exchanges references without reallocating GPU memory.
 *
 * The render targets are configured for HDR-quality state buffers:
 *   - HalfFloatType  → 16-bit float per channel (preserves negatives, no banding)
 *   - RGBAFormat     → 4 channels (e.g. position.xy + velocity.xy)
 *   - LinearFilter   → bilinear sampling (smooth advection)
 *   - depth/stencil  → disabled (we only need the color attachment)
 *
 * No shader code, no mesh, no rendering — buffers only.
 */

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import type { WebGLRenderer, WebGLRenderTarget } from "three"

export interface FBOPair {
  read: WebGLRenderTarget
  write: WebGLRenderTarget
  swap: () => void
}

/**
 * Allocate a ping-pong pair of WebGLRenderTargets.
 *
 * The `gl` argument is accepted for API symmetry with renderer-aware
 * factories (e.g. capability checks); the targets themselves are
 * renderer-agnostic and can be used by any THREE.WebGLRenderer.
 */
export function createFBOPair(
  gl: WebGLRenderer,
  width: number,
  height: number,
): FBOPair {
  // Touch `gl` so strict TS / lint rules don't flag it as unused while
  // we keep it on the public signature for future capability gating.
  void gl

  const options: THREE.RenderTargetOptions = {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  }

  const a: WebGLRenderTarget = new THREE.WebGLRenderTarget(width, height, options)
  const b: WebGLRenderTarget = new THREE.WebGLRenderTarget(width, height, options)

  const pair: FBOPair = {
    read: a,
    write: b,
    swap: (): void => {
      const tmp: WebGLRenderTarget = pair.read
      pair.read = pair.write
      pair.write = tmp
    },
  }

  return pair
}

export interface UseFBOResult {
  fbo: FBOPair
  swap: () => void
}

/**
 * React hook: creates a ping-pong FBO pair once on mount and disposes
 * both targets on unmount. The renderer is not required at construction
 * time — WebGLRenderTarget allocation is deferred until first bind by
 * three.js, so we can build the buffers without a live `gl`.
 */
export function useFBO(width: number, height: number): UseFBOResult {
  const fbo: FBOPair = useMemo<FBOPair>(() => {
    const options: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    }

    const a: WebGLRenderTarget = new THREE.WebGLRenderTarget(width, height, options)
    const b: WebGLRenderTarget = new THREE.WebGLRenderTarget(width, height, options)

    const pair: FBOPair = {
      read: a,
      write: b,
      swap: (): void => {
        const tmp: WebGLRenderTarget = pair.read
        pair.read = pair.write
        pair.write = tmp
      },
    }

    return pair
    // Width/height are intentionally captured once on mount. Resizing
    // is the consumer's responsibility (call setSize on read/write or
    // remount the hook with new dimensions).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect((): (() => void) => {
    return (): void => {
      fbo.read.dispose()
      fbo.write.dispose()
    }
  }, [fbo])

  return { fbo, swap: fbo.swap }
}
