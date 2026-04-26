"use client"

import * as THREE from "three"
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react"
import { createPortal, useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"

export interface TextBakerProps {
  text: string[]
  onBaked: (tex: THREE.Texture) => void
  width?: number
  height?: number
}

/**
 * Renders typography into an off-screen WebGLRenderTarget exactly once, on the
 * first frame after troika has finished its async glyph layout (onSync). The
 * text is mounted into a private THREE.Scene via createPortal, so it never
 * appears in the host R3F scene.
 *
 * Props.onBaked receives the rendered texture. The component itself adds
 * nothing visible to the parent scene graph.
 */
export default function TextBaker({
  text,
  onBaked,
  width = 2048,
  height = 512,
}: TextBakerProps): ReactElement {
  // Private scene — text mesh lives here, never in the host scene.
  const [bakeScene] = useState<THREE.Scene>(() => new THREE.Scene())

  // Ortho camera sized 1:1 with the render target in pixel space.
  const orthoCam = useMemo<THREE.OrthographicCamera>(() => {
    const cam = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1,
      1,
    )
    cam.position.z = 1
    cam.updateProjectionMatrix()
    return cam
  }, [width, height])

  // HalfFloat RGBA target, no depth, no stencil, no mipmaps.
  const target = useMemo<THREE.WebGLRenderTarget>(() => {
    const rt = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      colorSpace: THREE.LinearSRGBColorSpace,
    })
    rt.texture.name = "TextBaker.target"
    return rt
  }, [width, height])

  // Heuristic font size: largest line should fill ~90% of width, but capped
  // by ~42% of height per line so two stacked lines fit vertically.
  const fontSize = useMemo<number>(() => {
    const maxChars = text.reduce<number>((m, line) => Math.max(m, line.length), 1)
    // ~0.55 average advance ratio for a bold geometric sans at cap height.
    const widthBudget = (width * 0.9) / (maxChars * 0.55)
    const heightBudget = height * 0.42
    return Math.min(widthBudget, heightBudget)
  }, [text, width, height])

  const syncedRef = useRef<boolean>(false)
  const bakedRef = useRef<boolean>(false)

  // Latest onBaked callback without retriggering the bake effect.
  const onBakedRef = useRef<(tex: THREE.Texture) => void>(onBaked)
  useEffect(() => {
    onBakedRef.current = onBaked
  }, [onBaked])

  // Dispose the render target on unmount or when width/height changes.
  useEffect(() => {
    return () => {
      target.dispose()
    }
  }, [target])

  const handleSync = (): void => {
    syncedRef.current = true
  }

  useFrame(({ gl }) => {
    if (bakedRef.current) return
    if (!syncedRef.current) return

    // Save GL state, bake, restore.
    const prevTarget = gl.getRenderTarget()
    const prevClear = new THREE.Color()
    gl.getClearColor(prevClear)
    const prevAlpha = gl.getClearAlpha()
    const prevAutoClear = gl.autoClear

    gl.setRenderTarget(target)
    gl.setClearColor(0x000000, 1)
    gl.autoClear = true
    gl.clear(true, true, true)
    gl.render(bakeScene, orthoCam)

    gl.setRenderTarget(prevTarget)
    gl.setClearColor(prevClear, prevAlpha)
    gl.autoClear = prevAutoClear

    bakedRef.current = true
    target.texture.needsUpdate = true
    onBakedRef.current(target.texture)
  })

  // Single multi-line Text — joining with "\n" keeps both names within one
  // troika geometry so they sync atomically and the host scene stays clean.
  return (
    <>
      {createPortal(
        <Text
          font="/fonts/syne-bold.woff"
          fontSize={fontSize}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          lineHeight={0.92}
          letterSpacing={-0.02}
          onSync={handleSync}
        >
          {text.join("\n")}
        </Text>,
        bakeScene,
      )}
    </>
  )
}
