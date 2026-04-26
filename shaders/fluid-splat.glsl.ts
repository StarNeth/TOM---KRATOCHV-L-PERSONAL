// Gaussian splat shader.
// SPLAT_FRAG: adds an aspect-corrected Gaussian impulse (color or force)
// onto an existing field sampled from uTarget.

export const SPLAT_FRAG: string = /* glsl */ `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
uniform float uAspect;

void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float splat = exp(-dot(p, p) / uRadius);
  vec3 base = texture(uTarget, vUv).xyz;
  vec3 result = base + splat * uColor;
  fragColor = vec4(result, 1.0);
}
`
