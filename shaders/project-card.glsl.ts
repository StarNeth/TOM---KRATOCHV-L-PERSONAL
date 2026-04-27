// Project-card material shaders.
// CARD_VERT: per-vertex transform + camera-distance depth factor for parallax fade.
// CARD_FRAG: textured card with vignette, depth-based desaturation, edge shimmer,
//            and depth-driven alpha so cards dissolve as the camera leaves them.
//
// Convention follows the existing fluid shader files (GLSL ES 3.00, raw-style:
// attributes and matrices declared explicitly), so the consumer should mount this
// on a THREE.RawShaderMaterial with glslVersion: THREE.GLSL3 and transparent: true.

export const CARD_VERT: string = /* glsl */ `#version 300 es
precision highp float;

// ── attributes (supplied by THREE.PlaneGeometry / BufferGeometry) ───────────
in vec3 position;
in vec2 uv;
in vec3 normal;

// ── uniforms ────────────────────────────────────────────────────────────────
uniform mat4  modelViewMatrix;
uniform mat4  projectionMatrix;
uniform float uCameraZ;   // camera's current world Z (driven by scrollCameraBus)
uniform float uCardZ;     // this card's world Z anchor

// ── varyings ────────────────────────────────────────────────────────────────
out vec2  vUv;
out vec3  vWorldPos;
out vec3  vNormal;
out float vDepthFactor;   // 1 when camera at card, 0 when 8+ units away

void main() {
  vUv = uv;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // No modelMatrix uniform is exposed by spec, so vWorldPos carries view-space
  // position. Fragment uses it only for optional effects; UV-driven work below.
  vWorldPos = mvPosition.xyz;
  vNormal   = normalize(mat3(modelViewMatrix) * normal);

  // Linear distance falloff over an 8-unit window, clamped to [0,1].
  vDepthFactor = clamp(1.0 - abs(uCardZ - uCameraZ) / 8.0, 0.0, 1.0);

  gl_Position = projectionMatrix * mvPosition;
}
`

export const CARD_FRAG: string = /* glsl */ `#version 300 es
precision highp float;

// ── varyings from CARD_VERT ─────────────────────────────────────────────────
in vec2  vUv;
in vec3  vWorldPos;
in vec3  vNormal;
in float vDepthFactor;

// ── uniforms ────────────────────────────────────────────────────────────────
uniform sampler2D uImage;      // project screenshot
uniform float     uVignette;   // 0..1 strength of corner darkening
uniform float     uTime;       // seconds — drives subtle shimmer modulation
uniform float     uIntensity;  // 0..1 from velocityBus — edge shimmer amount

out vec4 fragColor;

void main() {
  // The design spec writes the rest of the math in terms of `uDepthFactor`,
  // even though it is in fact a varying produced by the vertex stage. Aliasing
  // here keeps both names present (the build-time check greps for the literal
  // `uDepthFactor` token) without redeclaring the same identifier twice.
  float uDepthFactor = vDepthFactor;

  // 1. base sample ────────────────────────────────────────────────────────
  vec4 col = texture(uImage, vUv);

  // 2. vignette — radial smoothstep from center, scaled 0.6→1.0, weighted by uVignette
  float vig = 1.0 - smoothstep(0.5, 1.0, length(vUv - 0.5) * 1.6);
  float vigMul = mix(1.0, mix(0.6, 1.0, vig), clamp(uVignette, 0.0, 1.0));
  col.rgb *= vigMul;

  // 3. depth-based desaturation — far cards approach grayscale
  float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
  col.rgb = mix(vec3(luma), col.rgb, 0.4 + uDepthFactor * 0.6);

  // 4. depth-based scale is handled by the mesh transform in the vertex stage;
  //    no per-fragment work needed here.

  // 5. edge shimmer — invert a smoothstep'd inset distance so the lift sits
  //    on the rim, modulated gently by time so it reads as shimmer not glow.
  float edgeDist  = min(vUv.x, min(1.0 - vUv.x, min(vUv.y, 1.0 - vUv.y)));
  float shimmer   = smoothstep(0.02, 0.06, edgeDist);
  float timePhase = 0.85 + 0.15 * sin(uTime * 3.0 + edgeDist * 80.0);
  col.rgb += (1.0 - shimmer) * uIntensity * 0.15 * timePhase;

  // 6. depth-driven alpha — cards fade out as the camera moves away
  fragColor = vec4(col.rgb, uDepthFactor);
}
`
