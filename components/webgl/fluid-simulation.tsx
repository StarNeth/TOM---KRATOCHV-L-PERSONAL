"use client"

/**
 * components/webgl/fluid-simulation.tsx
 *
 * Headless GPU fluid solver. Renders nothing visible — the dye field is
 * surfaced via the `onDyeReady` callback so a downstream pass (e.g. a
 * fullscreen quad in scene.tsx) can sample it.
 *
 * Pipeline (per frame, useFrame):
 *   1. Self-advect velocity        (velocity.read -> velocity.write, swap)
 *   2. Compute curl                 (velocity.read -> curl.write, swap)
 *   3. Vorticity confinement        (velocity.read + curl.read -> velocity.write, swap)
 *   4. Compute divergence           (velocity.read -> divergence.write, swap)
 *   5. Pressure solve               (Jacobi, N iterations on pressure pair)
 *   6. Gradient subtract            (velocity.read - grad(pressure) -> velocity.write, swap)
 *   7. Advect dye                   (dye.read along velocity.read -> dye.write, swap)
 *   8. If cursor active: splat both velocity and dye (FluidInput.addSplat)
 *   9. Bump dye texture version + emit onDyeReady(dye.read.texture)
 *
 * All FBOs are allocated via createFBOPair (HalfFloat / RGBA / Linear /
 * no depth-stencil). The pressure pair is single-channel-by-convention
 * but uses the same RGBA target — only the .x channel is sampled.
 *
 * Notes on shader versioning:
 *   - ADVECT_FRAG and SPLAT_FRAG are GLSL ES 3.00 (`#version 300 es`,
 *     `in`/`out`, `texture()`), paired with ADVECT_VERT (also 3.00,
 *     attribute-less, gl_VertexID-driven).
 *   - CURL/DIVERGENCE/PRESSURE/GRADIENT_SUBTRACT_FRAG are GLSL ES 1.00
 *     (`varying`, `texture2D()`, `gl_FragColor`). They are paired with
 *     V100_VERT, a small fullscreen-triangle vertex shader written here
 *     to match that version.
 *   - VORTICITY_FRAG is also GLSL 1.00 and lives inline below — there
 *     is no separate file for it because it is the only fragment shader
 *     specific to this assembly.
 */

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import { createFBOPair, type FBOPair } from "@/lib/fbo-system"
import { cursorBus } from "@/lib/cursor-bus"
import { FluidInput } from "@/lib/fluid-input"
import { ADVECT_VERT, ADVECT_FRAG } from "@/shaders/fluid-advect.glsl"
import {
  CURL_FRAG,
  DIVERGENCE_FRAG,
  PRESSURE_FRAG,
  GRADIENT_SUBTRACT_FRAG,
} from "@/shaders/fluid-ops.glsl"
import { SPLAT_FRAG } from "@/shaders/fluid-splat.glsl"
import { BLIT_FRAG } from "@/shaders/fluid-init.glsl"

// --------------------------------------------------------------------------
// GLSL ES 1.00 vertex shader for the operator passes. RawShaderMaterial
// does not auto-inject `precision` or the standard `position` attribute,
// so we declare them explicitly. The geometry is a 3-vertex fullscreen
// triangle; positions outside the [-1, 1] viewport are clipped.
// --------------------------------------------------------------------------
const V100_VERT: string = /* glsl */ `
  precision mediump float;

  attribute vec3 position;
  varying vec2 vUv;

  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// --------------------------------------------------------------------------
// Vorticity confinement — the only solver shader unique to this file.
// Reads the curl scalar field and synthesizes a force that re-injects
// rotational energy lost to numerical diffusion.
// --------------------------------------------------------------------------
const VORTICITY_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform vec2 uTexelSize;
  uniform float uCurlStrength;
  uniform float uDt;

  void main() {
    vec2 tx = uTexelSize;
    float L = texture2D(uCurl, vUv - vec2(tx.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(tx.x, 0.0)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, tx.y)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, tx.y)).x;
    float C = texture2D(uCurl, vUv).x;

    // Gradient of |curl|, rotated 90° to get a force perpendicular to it.
    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    // Avoid division by zero when curl is locally flat.
    force /= length(force) + 0.0001;
    force *= uCurlStrength * C;
    force.y *= -1.0;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity += force * uDt;
    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`

// --------------------------------------------------------------------------
// Component props.
// --------------------------------------------------------------------------
export interface FluidSimulationProps {
  /** Square FBO resolution. */
  resolution?: number
  /** Number of Jacobi iterations for the pressure projection. */
  pressureIterations?: number
  /** Vorticity confinement strength. */
  curl?: number
  /** Per-frame dye dissipation factor in (0, 1]. */
  dissipation?: number
  /**
   * One-shot seed texture for the dye field. When provided, the first
   * frame after mount blits this texture into the dye buffer (using
   * BLIT_FRAG) before any solver passes run, so subsequent advection
   * carries the seeded silhouette around. Re-supplying a different
   * texture later does not re-seed — this is intentionally one-shot.
   */
  initialTexture?: THREE.Texture | null
  /** Called every frame after the dye field has been updated. */
  onDyeReady?: (tex: THREE.Texture) => void
}

// --------------------------------------------------------------------------
// Internal cursor snapshot. Mutated in place; never replaced.
// --------------------------------------------------------------------------
interface CursorRef {
  uv: THREE.Vector2
  velocity: THREE.Vector2
  active: boolean
}

// --------------------------------------------------------------------------
// Uniform shapes (typed for safe `.value` access).
// --------------------------------------------------------------------------
interface AdvectUniforms {
  uVelocity: { value: THREE.Texture | null }
  uSource: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
  uDt: { value: number }
  uDissipation: { value: number }
}

interface CurlUniforms {
  uVelocity: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
}

interface VorticityUniforms {
  uVelocity: { value: THREE.Texture | null }
  uCurl: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
  uCurlStrength: { value: number }
  uDt: { value: number }
}

interface DivergenceUniforms {
  uVelocity: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
}

interface PressureUniforms {
  uPressure: { value: THREE.Texture | null }
  uDivergence: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
}

interface GradientUniforms {
  uPressure: { value: THREE.Texture | null }
  uVelocity: { value: THREE.Texture | null }
  uTexelSize: { value: THREE.Vector2 }
}

interface SplatUniforms {
  uTarget: { value: THREE.Texture | null }
  uPoint: { value: THREE.Vector2 }
  uColor: { value: THREE.Vector3 }
  uRadius: { value: number }
  uAspect: { value: number }
}

// --------------------------------------------------------------------------
// FluidSimulation
// --------------------------------------------------------------------------
export default function FluidSimulation(props: FluidSimulationProps): null {
  const {
    resolution = 512,
    pressureIterations = 20,
    curl: curlStrength = 30,
    dissipation = 0.98,
    initialTexture,
    onDyeReady,
  } = props

  const { gl } = useThree()

  // --- FBO pairs ---------------------------------------------------------
  const fbos = useMemo<{
    velocity: FBOPair
    dye: FBOPair
    curl: FBOPair
    divergence: FBOPair
    pressure: FBOPair
  }>(() => {
    return {
      velocity: createFBOPair(gl, resolution, resolution),
      dye: createFBOPair(gl, resolution, resolution),
      curl: createFBOPair(gl, resolution, resolution),
      divergence: createFBOPair(gl, resolution, resolution),
      pressure: createFBOPair(gl, resolution, resolution),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolution])

  // --- Shared offscreen scene (fullscreen triangle) ----------------------
  const offscreen = useMemo<{
    scene: THREE.Scene
    camera: THREE.Camera
    mesh: THREE.Mesh
    geometry: THREE.BufferGeometry
  }>(() => {
    const geometry: THREE.BufferGeometry = new THREE.BufferGeometry()
    // Fullscreen triangle: covers the [-1, 1] viewport with 3 vertices.
    const positions: Float32Array = new Float32Array([
      -1, -1, 0,
       3, -1, 0,
      -1,  3, 0,
    ])
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    const placeholder: THREE.RawShaderMaterial = new THREE.RawShaderMaterial()
    const mesh: THREE.Mesh = new THREE.Mesh(geometry, placeholder)
    mesh.frustumCulled = false

    const scene: THREE.Scene = new THREE.Scene()
    scene.add(mesh)

    const camera: THREE.Camera = new THREE.Camera()

    return { scene, camera, mesh, geometry }
  }, [])

  // --- Materials ---------------------------------------------------------
  const materials = useMemo<{
    advect: THREE.RawShaderMaterial
    curl: THREE.RawShaderMaterial
    vorticity: THREE.RawShaderMaterial
    divergence: THREE.RawShaderMaterial
    pressure: THREE.RawShaderMaterial
    gradient: THREE.RawShaderMaterial
    splat: THREE.RawShaderMaterial
    blit: THREE.RawShaderMaterial
  }>(() => {
    const texel: THREE.Vector2 = new THREE.Vector2(1 / resolution, 1 / resolution)

    const advect: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: ADVECT_VERT,
      fragmentShader: ADVECT_FRAG,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: texel.clone() },
        uDt: { value: 1 / 60 },
        uDissipation: { value: 1 },
      },
    })

    const curl: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: CURL_FRAG,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texel.clone() },
      },
    })

    const vorticity: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: VORTICITY_FRAG,
      uniforms: {
        uVelocity: { value: null },
        uCurl: { value: null },
        uTexelSize: { value: texel.clone() },
        uCurlStrength: { value: curlStrength },
        uDt: { value: 1 / 60 },
      },
    })

    const divergence: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: DIVERGENCE_FRAG,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texel.clone() },
      },
    })

    const pressure: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: PRESSURE_FRAG,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: texel.clone() },
      },
    })

    const gradient: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: GRADIENT_SUBTRACT_FRAG,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: texel.clone() },
      },
    })

    const splat: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: ADVECT_VERT,
      fragmentShader: SPLAT_FRAG,
      uniforms: {
        uTarget: { value: null },
        uPoint: { value: new THREE.Vector2(0.5, 0.5) },
        uColor: { value: new THREE.Vector3(0, 0, 0) },
        uRadius: { value: 0.0002 },
        uAspect: { value: 1 },
      },
    })

    // BLIT_FRAG is GLSL ES 1.00 (texture2D / gl_FragColor / varying);
    // pair it with the matching V100_VERT used by the operator passes.
    const blit: THREE.RawShaderMaterial = new THREE.RawShaderMaterial({
      vertexShader: V100_VERT,
      fragmentShader: BLIT_FRAG,
      uniforms: {
        uSource: { value: null },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uOpacity: { value: 1 },
      },
    })

    return { advect, curl, vorticity, divergence, pressure, gradient, splat, blit }
  }, [resolution, curlStrength])

  // --- FluidInput (used for the one-shot init blit) ---------------------
  // The per-frame splats are still handled inline below for performance —
  // FluidInput is wired up here only so initialTexture can be staged into
  // the dye buffer through its existing offscreen scene + render path.
  const fluidInput = useMemo<FluidInput>(() => {
    return new FluidInput(fbos.velocity, fbos.dye)
  }, [fbos])

  // Tracks whether the seed blit has already been issued; ensures the
  // initialTexture is consumed exactly once even if the prop reference
  // is stable and useFrame fires repeatedly.
  const hasBakedRef = useRef<boolean>(false)

  // Reusable scratch for the init tint so we don't allocate per frame
  // before the seed has fired.
  const initTint = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1))

  // --- Cursor ref --------------------------------------------------------
  const cursorRef = useRef<CursorRef>({
    uv: new THREE.Vector2(0.5, 0.5),
    velocity: new THREE.Vector2(0, 0),
    active: false,
  })

  // Sample cursor-bus once per animation frame and write into the ref.
  // The bus already smooths/normalizes pixel input, so we only need to
  // remap NDC -> UV and gate on motion magnitude.
  const lastCursorUv = useRef<THREE.Vector2>(new THREE.Vector2(0.5, 0.5))

  useEffect((): (() => void) => {
    if (typeof window === "undefined") return (): void => {}

    let raf: number = 0
    const tick = (): void => {
      const s = cursorBus.get()
      const uvX: number = s.x * 0.5 + 0.5
      const uvY: number = s.y * 0.5 + 0.5

      const dx: number = uvX - lastCursorUv.current.x
      const dy: number = uvY - lastCursorUv.current.y

      cursorRef.current.uv.set(uvX, uvY)
      // Use the bus's smoothed velocity (in NDC/frame). Rescale to UV/frame.
      cursorRef.current.velocity.set(s.vx * 0.5, s.vy * 0.5)
      cursorRef.current.active = Math.hypot(dx, dy) > 1e-4

      lastCursorUv.current.set(uvX, uvY)

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)
    return (): void => {
      window.cancelAnimationFrame(raf)
    }
  }, [])

  // --- Disposal ----------------------------------------------------------
  useEffect((): (() => void) => {
    return (): void => {
      // FBOs
      fbos.velocity.read.dispose()
      fbos.velocity.write.dispose()
      fbos.dye.read.dispose()
      fbos.dye.write.dispose()
      fbos.curl.read.dispose()
      fbos.curl.write.dispose()
      fbos.divergence.read.dispose()
      fbos.divergence.write.dispose()
      fbos.pressure.read.dispose()
      fbos.pressure.write.dispose()

      // Materials
      materials.advect.dispose()
      materials.curl.dispose()
      materials.vorticity.dispose()
      materials.divergence.dispose()
      materials.pressure.dispose()
      materials.gradient.dispose()
      materials.splat.dispose()
      materials.blit.dispose()

      // FluidInput (its own offscreen scene + geometry)
      fluidInput.dispose()

      // Geometry
      offscreen.geometry.dispose()
    }
  }, [fbos, materials, offscreen, fluidInput])

  // --- Per-frame pipeline -----------------------------------------------
  // Reusable scratch to avoid allocation during splats.
  const splatColor = useRef<THREE.Vector3>(new THREE.Vector3())

  // Save/restore the renderer's previous target so we don't disturb the
  // outer Canvas's render-to-screen flow.
  const draw = (
    material: THREE.RawShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ): void => {
    offscreen.mesh.material = material
    gl.setRenderTarget(target)
    gl.render(offscreen.scene, offscreen.camera)
  }

  useFrame((_, delta) => {
    const dt: number = Math.min(delta, 1 / 30) // clamp huge deltas
    const prevTarget: THREE.WebGLRenderTarget | null = gl.getRenderTarget()

    // 0. Seed the dye field once with the supplied initial texture.
    // Runs before the solver so the very first advection step can act
    // on the silhouette. After the blit, hasBakedRef latches true and
    // this branch is skipped for the lifetime of the component.
    if (
      initialTexture !== undefined &&
      initialTexture !== null &&
      hasBakedRef.current === false
    ) {
      fluidInput.initFromTexture({
        sourceTex: initialTexture,
        tint: initTint.current,
        opacity: 1,
        renderer: gl,
        dyeFBO: fbos.dye,
        blitMaterial: materials.blit,
      })
      hasBakedRef.current = true
    }

    // 1. Advect velocity ------------------------------------------------
    {
      const u = materials.advect.uniforms as unknown as AdvectUniforms
      u.uVelocity.value = fbos.velocity.read.texture
      u.uSource.value = fbos.velocity.read.texture
      u.uDt.value = dt
      u.uDissipation.value = 1
      draw(materials.advect, fbos.velocity.write)
      fbos.velocity.swap()
    }

    // 2. Curl -----------------------------------------------------------
    {
      const u = materials.curl.uniforms as unknown as CurlUniforms
      u.uVelocity.value = fbos.velocity.read.texture
      draw(materials.curl, fbos.curl.write)
      fbos.curl.swap()
    }

    // 3. Vorticity confinement -----------------------------------------
    {
      const u = materials.vorticity.uniforms as unknown as VorticityUniforms
      u.uVelocity.value = fbos.velocity.read.texture
      u.uCurl.value = fbos.curl.read.texture
      u.uCurlStrength.value = curlStrength
      u.uDt.value = dt
      draw(materials.vorticity, fbos.velocity.write)
      fbos.velocity.swap()
    }

    // 4. Divergence -----------------------------------------------------
    {
      const u = materials.divergence.uniforms as unknown as DivergenceUniforms
      u.uVelocity.value = fbos.velocity.read.texture
      draw(materials.divergence, fbos.divergence.write)
      fbos.divergence.swap()
    }

    // 5. Pressure (Jacobi) ---------------------------------------------
    {
      const u = materials.pressure.uniforms as unknown as PressureUniforms
      u.uDivergence.value = fbos.divergence.read.texture
      for (let i = 0; i < pressureIterations; i++) {
        u.uPressure.value = fbos.pressure.read.texture
        draw(materials.pressure, fbos.pressure.write)
        fbos.pressure.swap()
      }
    }

    // 6. Gradient subtract ---------------------------------------------
    {
      const u = materials.gradient.uniforms as unknown as GradientUniforms
      u.uPressure.value = fbos.pressure.read.texture
      u.uVelocity.value = fbos.velocity.read.texture
      draw(materials.gradient, fbos.velocity.write)
      fbos.velocity.swap()
    }

    // 7. Advect dye -----------------------------------------------------
    {
      const u = materials.advect.uniforms as unknown as AdvectUniforms
      u.uVelocity.value = fbos.velocity.read.texture
      u.uSource.value = fbos.dye.read.texture
      u.uDt.value = dt
      u.uDissipation.value = dissipation
      draw(materials.advect, fbos.dye.write)
      fbos.dye.swap()
    }

    // 8. Splats from cursor --------------------------------------------
    if (cursorRef.current.active) {
      const u = materials.splat.uniforms as unknown as SplatUniforms
      const vel = cursorRef.current.velocity
      const uv = cursorRef.current.uv

      u.uPoint.value.copy(uv)
      u.uRadius.value = 0.0002
      u.uAspect.value = 1

      // Pass 1: velocity (XY of color uniform = force)
      splatColor.current.set(vel.x * 100, vel.y * 100, 0)
      u.uColor.value = splatColor.current
      u.uTarget.value = fbos.velocity.read.texture
      draw(materials.splat, fbos.velocity.write)
      fbos.velocity.swap()

      // Pass 2: dye (RGB of color uniform = dye color)
      splatColor.current.set(0.6, 0.2, 0.9)
      u.uColor.value = splatColor.current
      u.uTarget.value = fbos.dye.read.texture
      draw(materials.splat, fbos.dye.write)
      fbos.dye.swap()
    }

    // Restore previous render target so the outer Canvas continues
    // rendering to the screen (or its own composer target).
    gl.setRenderTarget(prevTarget)

    // 9. Surface dye + bump version so consumers can detect updates.
    // RenderTarget textures are not auto-versioned by three.js on
    // render-to. We bump explicitly so `tex.version` reflects writes.
    fbos.dye.read.texture.version++
    if (onDyeReady !== undefined) {
      onDyeReady(fbos.dye.read.texture)
    }
  })

  return null
}
