import * as THREE from "three"
import { FluidInput } from "../lib/fluid-input"
import type { FBOPair } from "../lib/fbo-system"

function makeMockPair(): FBOPair {
  // Minimal duck-typed render target: addSplat is not called in this
  // smoke test, so only `texture` identity matters at construction time.
  const fakeTexture: THREE.Texture = new THREE.Texture()
  const target = {
    texture: fakeTexture,
    dispose: (): void => undefined,
  } as unknown as THREE.WebGLRenderTarget

  const pair: FBOPair = {
    read: target,
    write: target,
    swap: (): void => undefined,
  }
  return pair
}

const velocityFBO: FBOPair = makeMockPair()
const dyeFBO: FBOPair = makeMockPair()

const input: FluidInput = new FluidInput(velocityFBO, dyeFBO)
const stored = input.getStoredPairs()

console.log("instantiated:", input instanceof FluidInput)
console.log("velocity ref preserved:", stored.velocity === velocityFBO)
console.log("dye ref preserved:", stored.dye === dyeFBO)

input.dispose()
console.log("disposed without throw: true")
