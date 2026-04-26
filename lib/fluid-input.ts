/**
 * lib/fluid-input.ts
 *
 * FluidInput: stamps Gaussian splats into the velocity and dye FBO pairs
 * using a shared RawShaderMaterial (ADVECT_VERT + SPLAT_FRAG).
 *
 * No allocation per call — the splat material is supplied by the caller
 * and reused across both passes by mutating its uniforms in place.
 */

import * as THREE from "three"
import type { FBOPair } from "./fbo-system"

export interface SplatParams {
  point: THREE.Vector2
  velocity: THREE.Vector2
  color: THREE.Vector3
  radius: number
  aspect: number
  renderer: THREE.WebGLRenderer
  velocityFBO: FBOPair
  dyeFBO: FBOPair
  splatMaterial: THREE.RawShaderMaterial
}

interface SplatUniforms {
  uTarget: { value: THREE.Texture | null }
  uPoint: { value: THREE.Vector2 }
  uColor: { value: THREE.Vector3 }
  uRadius: { value: number }
  uAspect: { value: number }
}

export class FluidInput {
  // Stored references for any future per-instance lookups (e.g. resize
  // notifications). The authoritative pairs at draw time come from the
  // SplatParams supplied to addSplat().
  private readonly velocityFBO: FBOPair
  private readonly dyeFBO: FBOPair

  // Reusable scratch — avoids allocating a new Vector3 per splat call
  // when packing a 2D velocity into a 3-component uniform.
  private readonly velocityScratch: THREE.Vector3 = new THREE.Vector3()

  // Fullscreen-triangle scene. The vertex shader uses gl_VertexID, so
  // the geometry only needs three vertices' worth of draw range; we
  // attach a 3-vertex position attribute so three.js issues drawArrays(0, 3).
  private readonly scene: THREE.Scene
  private readonly camera: THREE.Camera
  private readonly mesh: THREE.Mesh

  constructor(velocityFBO: FBOPair, dyeFBO: FBOPair) {
    this.velocityFBO = velocityFBO
    this.dyeFBO = dyeFBO

    const geometry: THREE.BufferGeometry = new THREE.BufferGeometry()
    // Three placeholder vertices — values are unused; gl_VertexID drives
    // position derivation in ADVECT_VERT.
    const positions: Float32Array = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0])
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))

    // Material is assigned per-call from SplatParams. We start with a
    // throwaway placeholder so Mesh's constructor type is satisfied;
    // it is overwritten before the first render.
    const placeholder: THREE.RawShaderMaterial = new THREE.RawShaderMaterial()

    this.mesh = new THREE.Mesh(geometry, placeholder)
    this.mesh.frustumCulled = false

    this.scene = new THREE.Scene()
    this.scene.add(this.mesh)

    this.camera = new THREE.Camera()
  }

  addSplat(params: SplatParams): void {
    const {
      point,
      velocity,
      color,
      radius,
      aspect,
      renderer,
      velocityFBO,
      dyeFBO,
      splatMaterial,
    } = params

    // Bind the caller's material to our fullscreen triangle.
    this.mesh.material = splatMaterial

    const uniforms: SplatUniforms = splatMaterial.uniforms as unknown as SplatUniforms

    uniforms.uPoint.value = point
    uniforms.uRadius.value = radius
    uniforms.uAspect.value = aspect

    // Pass 1: velocity. Pack the 2D force into XY of the color uniform,
    // leaving Z at 0 so the velocity buffer's third channel is unaffected.
    this.velocityScratch.set(velocity.x, velocity.y, 0)
    uniforms.uColor.value = this.velocityScratch
    uniforms.uTarget.value = velocityFBO.read.texture

    renderer.setRenderTarget(velocityFBO.write)
    renderer.render(this.scene, this.camera)
    velocityFBO.swap()

    // Pass 2: dye. Reuse the same material with the RGB color value.
    uniforms.uColor.value = color
    uniforms.uTarget.value = dyeFBO.read.texture

    renderer.setRenderTarget(dyeFBO.write)
    renderer.render(this.scene, this.camera)
    dyeFBO.swap()

    // Restore the renderer's default target so subsequent draws do not
    // accidentally write into the dye FBO.
    renderer.setRenderTarget(null)
  }

  /**
   * Read access to the constructor-supplied references. Useful for
   * callers that want to assert identity in tests or wire up resizes.
   */
  getStoredPairs(): { velocity: FBOPair; dye: FBOPair } {
    return { velocity: this.velocityFBO, dye: this.dyeFBO }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.scene.remove(this.mesh)
  }
}
