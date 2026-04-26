// Fluid initialisation shader.
// BLIT_FRAG: copies a single-channel mask (text bake's red channel)
// into the dye buffer with an RGB tint and opacity multiplier.
//
// White-text-on-black bakes carry the mask in `s.r`. The output packs
// the tinted mask into RGB and the raw mask into A, so downstream
// passes can use either channel depending on whether they want the
// premultiplied colour or the original silhouette.
//
// GLSL ES 1.00 — paired with V100_VERT in fluid-simulation.tsx.

export const BLIT_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uSource;
  uniform vec3 uTint;
  uniform float uOpacity;

  void main() {
    vec4 s = texture2D(uSource, vUv);
    gl_FragColor = vec4(s.r * uTint, s.r * uOpacity);
  }
`
