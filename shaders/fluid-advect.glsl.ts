// Fluid advection shaders.
// ADVECT_VERT: attribute-less fullscreen triangle driven by gl_VertexID.
// ADVECT_FRAG: backward-trace advection of a source field along a velocity field.

export const ADVECT_VERT: string = /* glsl */ `#version 300 es
precision mediump float;

out vec2 vUv;

void main() {
  vec2 positions[3] = vec2[](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  vec2 p = positions[gl_VertexID];
  vUv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`

export const ADVECT_FRAG: string = /* glsl */ `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 prevUv = vUv - vel * uDt * uTexelSize;
  vec4 sampled = texture(uSource, prevUv);
  fragColor = sampled * uDissipation;
}
`
