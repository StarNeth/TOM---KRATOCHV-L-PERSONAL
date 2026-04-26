/**
 * Fluid simulation operator shaders.
 *
 * All shaders share the same fullscreen vertex stage as ADVECT_VERT
 * (see ./fluid-advect.glsl.ts) and operate on neighbor samples
 * derived from `vUv` and `uTexelSize`.
 */

const NEIGHBORS = /* glsl */ `
  vec2 tx = uTexelSize;
  vec2 uvL = vUv - vec2(tx.x, 0.0);
  vec2 uvR = vUv + vec2(tx.x, 0.0);
  vec2 uvB = vUv - vec2(0.0, tx.y);
  vec2 uvT = vUv + vec2(0.0, tx.y);
`

export const CURL_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    ${NEIGHBORS}

    vec2 vL = texture2D(uVelocity, uvL).xy;
    vec2 vR = texture2D(uVelocity, uvR).xy;
    vec2 vB = texture2D(uVelocity, uvB).xy;
    vec2 vT = texture2D(uVelocity, uvT).xy;

    float curl = (vR.y - vL.y) - (vT.x - vB.x);
    gl_FragColor = vec4(curl, 0.0, 0.0, 1.0);
  }
`

export const DIVERGENCE_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    ${NEIGHBORS}

    vec2 vL = texture2D(uVelocity, uvL).xy;
    vec2 vR = texture2D(uVelocity, uvR).xy;
    vec2 vB = texture2D(uVelocity, uvB).xy;
    vec2 vT = texture2D(uVelocity, uvT).xy;

    float div = 0.5 * ((vR.x - vL.x) + (vT.y - vB.y));
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`

export const PRESSURE_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  uniform vec2 uTexelSize;

  void main() {
    ${NEIGHBORS}

    float bL = texture2D(uPressure, uvL).x;
    float bR = texture2D(uPressure, uvR).x;
    float bB = texture2D(uPressure, uvB).x;
    float bT = texture2D(uPressure, uvT).x;

    float divergence = texture2D(uDivergence, vUv).x;
    float pressure = (bL + bR + bT + bB - divergence) * 0.25;

    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`

export const GRADIENT_SUBTRACT_FRAG: string = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;

  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  uniform vec2 uTexelSize;

  void main() {
    ${NEIGHBORS}

    float pL = texture2D(uPressure, uvL).x;
    float pR = texture2D(uPressure, uvR).x;
    float pB = texture2D(uPressure, uvB).x;
    float pT = texture2D(uPressure, uvT).x;

    vec2 velocity = texture2D(uVelocity, vUv).xy;
    velocity.x -= 0.5 * (pR - pL);
    velocity.y -= 0.5 * (pT - pB);

    gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`
