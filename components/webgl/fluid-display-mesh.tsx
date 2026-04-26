"use client"

/**
 * components/webgl/fluid-display-mesh.tsx
 *
 * Visible surface for the headless fluid simulation. The mesh is sized to
 * cover the hero viewport (top 1 × 2 of the 2×2 ortho-camera space) and
 * additively blends the dye texture onto whatever the underlying liquid-
 * obsidian pass already rendered. The text "appears to glow in the fluid"
 * — it's not painted on top, it's light being added to the existing image.
 *
 * Contract:
 *   • dyeTexture is a ref-bag (mutated by FluidSimulation.onDyeReady each
 *     frame). We sample it in useFrame so React never re-renders for the
 *     handoff. If the ref is still empty, the uniform stays null and the
 *     fragment shader emits zero — invisible until the first dye frame.
 *   • Vignette mask: smooth falloff 10% inward on every edge. Keeps the
 *     dye field from clipping abruptly at the plane's borders so the
 *     glow blends seamlessly into the liquid background.
 *   • Additive blending + depthTest off — the underlying mesh draws first
 *     (renderOrder 0), this mesh draws on top (renderOrder 10) and adds
 *     light. EffectComposer's bloom subsequently scoops up the bright
 *     dye peaks for the soft halo.
 *   • The plane occupies y ∈ [0, 1] of the ortho camera (top half), which
 *     is exactly where the hero name used to live. Width spans full canvas
 *     (x ∈ [-1, 1]).
 */

import { useMemo, useRef, type MutableRefObject, type ReactElement } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export interface FluidDisplayMeshProps {
  /**
   * Live handle to the fluid dye texture. FluidSimulation mutates
   * `.current` in its onDyeReady callback every frame; we read it here
   * via useFrame and feed the uniform without triggering React renders.
   */
  dyeTexture: MutableRefObject<THREE.Texture | null>
}

interface DisplayUniforms {
  uDye: { value: THREE.Texture | null }
  uHasDye: { value: number }
}

const VERTEX_SHADER: string = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER: string = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uDye;
  uniform float     uHasDye;

  void main() {
    // Sample the fluid dye field. When uHasDye is 0 (first few frames
    // before the simulation has emitted anything), force black so the
    // texture default doesn't leak.
    vec4 dye = texture2D(uDye, vUv) * uHasDye;

    // Vignette: 10% smooth falloff on each edge so the rectangular plane
    // does not show its borders. smoothstep(0.0, 0.10, t) ramps from 0
    // at the edge to 1 at 10% inward; mirrored on the opposite side.
    float edgeX = smoothstep(0.0, 0.10, vUv.x) *
                  smoothstep(0.0, 0.10, 1.0 - vUv.x);
    float edgeY = smoothstep(0.0, 0.10, vUv.y) *
                  smoothstep(0.0, 0.10, 1.0 - vUv.y);
    float mask = edgeX * edgeY;

    // Premultiplied for additive blending — the alpha channel doesn't
    // matter under THREE.AdditiveBlending, only the RGB term, but we
    // keep alpha consistent for any downstream composer that might
    // sample it.
    vec3 lit = dye.rgb * mask;
    gl_FragColor = vec4(lit, mask);
  }
`

export default function FluidDisplayMesh({
  dyeTexture,
}: FluidDisplayMeshProps): ReactElement {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)

  // Uniforms are stable across renders. The texture slot is updated each
  // frame from the ref; the has-dye flag flips to 1 the moment we see
  // the first non-null texture so the vignette doesn't show pure noise.
  const uniforms = useMemo<DisplayUniforms>(
    () => ({
      uDye:    { value: null },
      uHasDye: { value: 0 },
    }),
    [],
  )

  useFrame(() => {
    const mat = materialRef.current
    if (!mat) return
    const u = mat.uniforms as unknown as DisplayUniforms
    const tex = dyeTexture.current
    if (tex !== null) {
      u.uDye.value = tex
      u.uHasDye.value = 1
    } else {
      u.uHasDye.value = 0
    }
  })

  // Position [0, 0.5, 0]: centers the 2×1 plane in the top half of the
  // ortho camera's [-1, 1] vertical span. renderOrder 10 ensures it
  // composites after the obsidian background mesh (renderOrder 0).
  return (
    <mesh position={[0, 0.5, 0]} renderOrder={10}>
      <planeGeometry args={[2, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
