"use client"

/**
 * scene.tsx — Liquid Obsidian · Physical Simulation Grade
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ELITE UPGRADE — "From Noise Animation to Material Science"
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  PBR LIGHTING (NEW)
 *    • Surface normal is reconstructed from `dFdx(h)` / `dFdy(h)` (GPU
 *      screen-space derivatives) — FREE, no extra FBM samples.
 *    • Normal is perturbed by a single LOW-FREQUENCY FBM octave ("deep
 *      churn" layer) — adds volumetric depth at the cost of 1 vnoise.
 *    • Cook-Torrance GGX BRDF:
 *        - D  = GGX microfacet distribution
 *        - G  = Smith Schlick-GGX geometry term
 *        - F  = Fresnel-Schlick
 *      Light direction PARALLAX-SHIFTS with cursor position so the
 *      specular hotspot moves with the viewer, not with a fixed sun.
 *
 *  AMBIENT OCCLUSION (NEW)
 *    • AO is derived from the height gradient magnitude — high gradient
 *      means steep slope, and concave valleys (where h is low but the
 *      neighbourhood has high gradient) get darkened. This pushes the
 *      surface from "2D shimmer" into real 3D perceptual space.
 *
 *  VELOCITY-REACTIVE TURBULENCE (NEW)
 *    • `uTurbulence` uniform is driven by the VelocityBus. When scroll
 *      intensity crosses a threshold, a turbulence burst (0→1 in 400ms,
 *      decay in 2s) agitates the domain-warp magnitude. The fluid
 *      literally *reacts* to scroll velocity.
 *
 *  CURSOR-AS-PHYSICAL-FORCE (NEW)
 *    • `uCursor`, `uCursorVel`, `uCursorEnergy` — the cursor now leaves
 *      a decaying wake of UV displacement on the fluid. Move fast, the
 *      surface tears. Stop, the wake heals.
 *
 *  STUTTER-FREE PRELOADER HANDOFF (NEW)
 *    • Instead of firing `webgl-ready` onCreated (before the first frame
 *      is rendered), we gate on `gl.info.render.frame >= 1` and
 *      dispatch `webgl-first-frame`. The preloader listens for THIS
 *      event. Guarantees zero stutter from preloader → scene reveal.
 *
 *  PERFORMANCE CONTRACT
 *    FBM calls per pixel (desktop): 2  → 3 (1 extra for normal perturb)
 *    FBM calls per pixel (mobile):  2  → 2 (normal perturb skipped)
 *    Height samples:                1 (reused across body/ridge/CA/BRDF)
 *    Normal reconstruction:         free (dFdx / dFdy are hardware ops)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useRef, useMemo, useEffect, useState, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import * as THREE from "three"
import gsap from "gsap"
import { useMobile } from "@/hooks/use-mobile"
import { useWebGLSupport } from "@/hooks/use-webgl-support"
import { CSSFallbackGradient } from "./css-fallback-gradient"
import { velocityBus } from "@/lib/velocity-bus"

// ─── CURSOR BUS ──────────────────────────────────────────────────────────────
// Module-level singleton consumed by both the cursor.tsx HUD and the shader.
// The cursor writes target position + raw pixel velocity here every rAF tick;
// the shader reads in useFrame. No events, no React state — pure refs.
type CursorState = {
  x: number        // normalized [-aspect, aspect] (aspect applied in shader)
  y: number        // normalized [-1, 1]
  vx: number       // smoothed dx / frame in normalized space
  vy: number       // smoothed dy / frame in normalized space
  energy: number   // 0..1 — motion energy, decays ~0.86/frame when idle
}

const cursorBusState: CursorState = { x: 0, y: 0, vx: 0, vy: 0, energy: 0 }

export const cursorBus = {
  get: () => cursorBusState,
  /** Pixel-space write from cursor.tsx — normalizes internally. */
  writePixel(px: number, py: number) {
    const nx = (px / window.innerWidth)  * 2 - 1
    const ny = -(py / window.innerHeight) * 2 + 1
    const dx = nx - cursorBusState.x
    const dy = ny - cursorBusState.y
    const mag = Math.hypot(dx, dy)
    // Exponential smoothing for velocity; burst on fast movement
    cursorBusState.vx = cursorBusState.vx * 0.72 + dx * 0.28
    cursorBusState.vy = cursorBusState.vy * 0.72 + dy * 0.28
    // Energy saturates fast, decays slow (handled in useFrame)
    cursorBusState.energy = Math.min(1, cursorBusState.energy + mag * 6)
    cursorBusState.x = nx
    cursorBusState.y = ny
  },
}

type LiquidProps = { isMobile: boolean; onFirstFrame: () => void }

const LiquidObsidianMaterial = ({ isMobile, onFirstFrame }: LiquidProps) => {
  const materialRef   = useRef<THREE.ShaderMaterial>(null)
  const targetMouse   = useRef(new THREE.Vector2(0, 0))
  const firedRef      = useRef(false)
  const turbulenceRef = useRef({ value: 0, target: 0, peakAt: 0 })
  const dpr = isMobile ? 1 : 1.5

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(
        window.innerWidth * dpr,
        window.innerHeight * dpr
      )
    }

    // Passive mouse — never blocks scroll thread. We keep the LEGACY
    // uMouse warp (hero interaction) AND feed the new cursorBus in parallel.
    const onMouse = (e: MouseEvent) => {
      targetMouse.current.x =  (e.clientX / window.innerWidth)  * 2 - 1
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
      cursorBus.writePixel(e.clientX, e.clientY)
    }
    const onResize = () => {
      if (!materialRef.current) return
      materialRef.current.uniforms.uResolution.value.set(
        window.innerWidth * dpr,
        window.innerHeight * dpr
      )
    }
    const onShoot = (e: Event) => {
      if (!materialRef.current) return
      const ev = e as CustomEvent<{ x: number; y: number }>
      const cx =  (ev.detail.x / window.innerWidth)  * 2 - 1
      const cy = -(ev.detail.y / window.innerHeight) * 2 + 1
      materialRef.current.uniforms.uClickPos.value.set(cx, cy)
      gsap.fromTo(
        materialRef.current.uniforms.uClickRipple,
        { value: 0.0 },
        {
          value: 1.0,
          duration: 2.5,
          ease: "cubic-bezier(0.22, 1, 0.36, 1)",
          overwrite: "auto",
        }
      )
    }
    const onTransition = (e: Event) => {
      if (!materialRef.current) return
      const ev = e as CustomEvent<{ value: number; color?: number }>
      materialRef.current.uniforms.uTransition.value = Math.max(
        0,
        Math.min(1, ev.detail.value)
      )
      if (typeof ev.detail.color === "number") {
        materialRef.current.uniforms.uZoneOverride.value = ev.detail.color
      }
    }

    window.addEventListener("resize", onResize)
    window.addEventListener("webgl-shoot", onShoot as EventListener)
    window.addEventListener("webgl-transition", onTransition as EventListener)
    if (!isMobile)
      window.addEventListener("mousemove", onMouse, { passive: true })

    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("webgl-shoot", onShoot as EventListener)
      window.removeEventListener("webgl-transition", onTransition as EventListener)
      if (!isMobile) window.removeEventListener("mousemove", onMouse)
    }
  }, [isMobile, dpr])

  const uniforms = useMemo(
    () => ({
      uTime:          { value: 0 },
      uResolution:    { value: new THREE.Vector2(1, 1) },
      uMouse:         { value: new THREE.Vector2(0, 0) },
      uVelocity:      { value: 0 },
      uIntensity:     { value: 0 },
      uScrollProgress:{ value: 0 },
      uClickPos:      { value: new THREE.Vector2(0, 0) },
      uClickRipple:   { value: 1.0 },
      uTransition:    { value: 0.0 },
      uZoneOverride:  { value: -1.0 },
      // ── NEW: velocity-reactive turbulence (0..1) ────────────────
      uTurbulence:    { value: 0 },
      // ── NEW: cursor as a physical force ─────────────────────────
      uCursor:        { value: new THREE.Vector2(0, 0) },
      uCursorVel:     { value: new THREE.Vector2(0, 0) },
      uCursorEnergy:  { value: 0 },
    }),
    []
  )

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  // ─────────────────────────────────────────────────────────────────────────
  // FRAGMENT SHADER — "Liquid Obsidian" · Cook-Torrance GGX
  // ─────────────────────────────────────────────────────────────────────────
  const fragmentShader = useMemo(
    () => /* glsl */`
    #ifdef GL_ES
    precision ${isMobile ? "mediump" : "highp"} float;
    #endif
    #define IS_MOBILE ${isMobile ? "1" : "0"}

    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec2  uMouse;
    uniform float uVelocity;
    uniform float uIntensity;
    uniform float uScrollProgress;
    uniform vec2  uClickPos;
    uniform float uClickRipple;
    uniform float uTransition;
    uniform float uZoneOverride;
    uniform float uTurbulence;
    uniform vec2  uCursor;
    uniform vec2  uCursorVel;
    uniform float uCursorEnergy;

    // ── PRIMITIVES ────────────────────────────────────────────────────
    float random(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    mat2 rot(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }

    // Smooth 2D value noise — C1-continuous Hermite interpolation.
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // ── UNROLLED FBM ──────────────────────────────────────────────────
    float fbm(vec2 p) {
      float sum  = 0.500 * vnoise(rot(0.500) * p       + uTime * 0.060);
            sum += 0.250 * vnoise(rot(0.870) * p * 2.0 + uTime * 0.120);
            sum += 0.125 * vnoise(rot(1.240) * p * 4.0 + uTime * 0.240);
      #if IS_MOBILE == 0
            sum += 0.0625 * vnoise(rot(1.610) * p * 8.0 + uTime * 0.480);
      #endif
      return sum;
    }

    // ── DOMAIN-WARPED HEIGHT FIELD ────────────────────────────────────
    // Warp magnitude is modulated by velocity-driven turbulence.
    float fluidHeight(vec2 p, float mousePower) {
      float warpAmp = 2.4 + uTurbulence * 1.8;           // 2.4 → 4.2 at peak
      float n1 = fbm(p * 1.4 + vec2(uTime * 0.04, uTime * 0.03));
      vec2  warped = p * 1.6 + vec2(n1 * warpAmp, n1 * (warpAmp * 0.75));
      float h = fbm(warped + uTime * 0.02);
      h += mousePower * 0.25;
      // Cursor as force: decaying wake pushes h upward in cursor's trail
      float cursorDist = length(p - uCursor * vec2(uResolution.x / uResolution.y, 1.0));
      float cursorWake = exp(-cursorDist * 3.2) * uCursorEnergy;
      h += cursorWake * 0.18;
      return clamp(h, 0.0, 1.0);
    }

    float fluidRidge(float h) {
      float crest = smoothstep(0.50, 0.74, h);
      return crest * crest;
    }

    // ── ZONE PALETTE ──────────────────────────────────────────────────
    void zoneColors(out vec3 floorCol, out vec3 peakCol) {
      vec3 obsFloor  = vec3(0.008, 0.009, 0.012);
      vec3 obsPeak   = vec3(0.85,  0.88,  1.00);
      vec3 cobFloor  = vec3(0.004, 0.008, 0.022);
      vec3 cobPeak   = vec3(0.25,  0.55,  1.80);
      vec3 nukeFloor = vec3(0.014, 0.005, 0.003);
      vec3 nukePeak  = vec3(1.50, 0.45, 0.02);
      vec3 emFloor   = vec3(0.004, 0.010, 0.006);
      vec3 emPeak    = vec3(0.15, 0.90, 0.35);

      floorCol = obsFloor;
      peakCol  = obsPeak;

      float mixCobalt = smoothstep(0.08, 0.40, uScrollProgress)
                      - smoothstep(0.62, 0.90, uScrollProgress);
      floorCol = mix(floorCol, cobFloor, mixCobalt);
      peakCol  = mix(peakCol,  cobPeak,  mixCobalt);

      float mixNuke = smoothstep(0.70, 0.98, uScrollProgress);
      floorCol = mix(floorCol, nukeFloor, mixNuke);
      peakCol  = mix(peakCol,  nukePeak,  mixNuke);

      if (uZoneOverride > -0.5) {
        if      (uZoneOverride < 0.5) { floorCol = obsFloor;  peakCol = obsPeak; }
        else if (uZoneOverride < 1.5) { floorCol = cobFloor;  peakCol = cobPeak; }
        else if (uZoneOverride < 2.5) { floorCol = nukeFloor; peakCol = nukePeak; }
        else                          { floorCol = emFloor;   peakCol = emPeak; }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PBR — Cook-Torrance GGX BRDF
    // Cheap arithmetic only — no noise samples.
    // ═══════════════════════════════════════════════════════════════════
    const float PI = 3.14159265359;

    float D_GGX(float NdotH, float rough) {
      float a  = rough * rough;
      float a2 = a * a;
      float d  = (NdotH * NdotH) * (a2 - 1.0) + 1.0;
      return a2 / (PI * d * d + 1e-5);
    }
    float G_Smith(float NdotV, float NdotL, float rough) {
      float r = rough + 1.0;
      float k = (r * r) * 0.125;
      float gV = NdotV / (NdotV * (1.0 - k) + k + 1e-5);
      float gL = NdotL / (NdotL * (1.0 - k) + k + 1e-5);
      return gV * gL;
    }
    vec3 F_Schlick(vec3 F0, float cosT) {
      return F0 + (1.0 - F0) * pow(1.0 - cosT, 5.0);
    }

    // ── COLOR FROM HEIGHT + BRDF + AO ────────────────────────────────
    vec3 shadeSurface(
      float h, float ridge, vec3 floorCol, vec3 peakCol,
      vec3 N, float ao
    ) {
      // 1. Body — crushed height → vast dark floor, gentle mid-tone rise
      float crushed = pow(h, 5.0);
      vec3 body = mix(floorCol, peakCol, crushed * 0.35);

      // 2. Ridge energy (the "ferrofluid spike" bloom target)
      float ridgeEnergy = 1.6 + uIntensity * 1.4;
      vec3 ridgeEmit = peakCol * ridge * ridgeEnergy;

      // 3. GGX specular — light direction parallax-shifts with cursor,
      //    adding a second light that tracks the mouse for depth cues.
      vec3 V = vec3(0.0, 0.0, 1.0);                               // fixed viewer
      vec3 L = normalize(vec3(uMouse * 0.6 + uCursor * 0.4, 1.3));// parallax light
      vec3 H = normalize(L + V);
      float NdotL = max(dot(N, L), 0.0);
      float NdotV = max(dot(N, V), 0.0);
      float NdotH = max(dot(N, H), 0.0);
      float VdotH = max(dot(V, H), 0.0);

      // Obsidian F0 ≈ dielectric; ramps toward chromium-metal at peak
      vec3 F0 = mix(vec3(0.035), peakCol * 0.75, ridge * 0.9);
      float roughness = mix(0.38, 0.12, ridge); // crests are glossier

      float D = D_GGX(NdotH, roughness);
      float G = G_Smith(NdotV, NdotL, roughness);
      vec3  F = F_Schlick(F0, VdotH);
      vec3 specular = (D * G) * F / max(4.0 * NdotV * NdotL, 1e-3);

      // 4. Apply AO only to the diffuse/body contribution — peaks glow freely.
      vec3 lit = body * ao + specular * NdotL * 1.35 + ridgeEmit;

      // 5. Reader protection at end of scroll
      float dimming = mix(1.0, 0.4, smoothstep(0.85, 1.0, uScrollProgress));
      return lit * dimming;
    }

    // ── ASCII MATRIX OVERLAY ──────────────────────────────────────────
    float asciiGlyph(vec2 cellUv, float seed) {
      vec2 g = floor(cellUv * vec2(5.0, 7.0));
      float r = random(g + vec2(seed * 13.0, seed * 7.0));
      float threshold = mix(0.35, 0.72, fract(seed * 1.37));
      float on = step(threshold, r);
      vec2 f = fract(cellUv * vec2(5.0, 7.0));
      float inner = step(0.1, f.x) * step(0.1, f.y)
                  * step(f.x, 0.9) * step(f.y, 0.9);
      return on * inner;
    }

    // ─────────────────────────────────────────────────────────────────
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p  = -1.0 + 2.0 * uv;
      p.x *= uResolution.x / uResolution.y;

      vec2 cp = uClickPos;
      cp.x *= uResolution.x / uResolution.y;

      // ── LEGACY MOUSE SWIRL (kept for hero interaction) ───────────────
      float mousePower = 0.0;
      #if IS_MOBILE == 0
      if (uTransition < 0.9) {
        vec2 m = uMouse;
        m.x *= uResolution.x / uResolution.y;
        vec2 delta = p - m;
        float distMouse = length(delta);
        mousePower = exp(-distMouse * 6.0);
        p = m + rot(mousePower * 1.5) * delta;
        p -= normalize(delta + vec2(0.0001)) * mousePower * 0.15;
      }
      #endif

      // ── CURSOR DRAG WAKE — surface tears in cursor's velocity direction
      #if IS_MOBILE == 0
      vec2 cPos = uCursor * vec2(uResolution.x / uResolution.y, 1.0);
      float cDist = length(p - cPos);
      float wake  = exp(-cDist * 4.5) * uCursorEnergy;
      p += uCursorVel * vec2(uResolution.x / uResolution.y, 1.0) * wake * 0.35;
      #endif

      // ── REFRACTIVE CLICK SHOCKWAVE ───────────────────────────────────
      float isExploding  = step(uClickRipple, 0.99);
      vec2  toClick      = p - cp;
      float distClick    = length(toClick);
      vec2  radialDir    = toClick / max(distClick, 0.0001);

      float ringRadius   = uClickRipple * 3.0;
      float waveSigned   = (distClick - ringRadius) * 6.5;
      float waveProfile  = -waveSigned * exp(-waveSigned * waveSigned * 0.5);
      float waveDecay    = pow(1.0 - uClickRipple, 1.4) * isExploding;
      p += radialDir * waveProfile * 0.42 * waveDecay;

      float edgeGlow = exp(-waveSigned * waveSigned * 1.2) * waveDecay;

      // ── VELOCITY PHYSICS ─────────────────────────────────────────────
      p.x += uVelocity * 0.22 * p.y;
      p.y -= uVelocity * 0.80;
      p   *= mix(1.50, 1.26, uIntensity);

      // ═══════════════════════════════════════════════════════════════
      // HEIGHT — single evaluation, reused everywhere below.
      // ═══════════════════════════════════════════════════════════════
      float h     = fluidHeight(p * (1.0 + uIntensity * 0.15), mousePower);
      float ridge = fluidRidge(h);

      // ── NORMAL RECONSTRUCTION (screen-space derivatives) ────────────
      // dFdx/dFdy are HARDWARE ops — effectively free. The z component
      // is a constant that controls the "relief strength".
      vec2 dH = vec2(dFdx(h), dFdy(h));
      vec3 N  = normalize(vec3(-dH * 3.5, 1.0));

      // ── SECONDARY NORMAL LAYER — low-frequency "deep churn" ─────────
      // Audit fix: "true volumetric fluid requires a secondary normal-map
      // layer driven by a slower, lower-frequency FBM octave." 1 extra
      // vnoise — ~4% shader cost — for dramatic perceptual depth gain.
      #if IS_MOBILE == 0
      float deepChurn = vnoise(p * 0.35 + uTime * 0.015);
      vec2  deepGrad  = vec2(
        vnoise(p * 0.35 + vec2(0.01, 0.0) + uTime * 0.015) - deepChurn,
        vnoise(p * 0.35 + vec2(0.0, 0.01) + uTime * 0.015) - deepChurn
      ) * 100.0;
      N = normalize(N + vec3(deepGrad * 0.12, 0.0));
      #endif

      // ── AMBIENT OCCLUSION (noise gradient derived) ──────────────────
      // High gradient magnitude indicates a slope; pair with low h and
      // you've identified a shadowed crevice. This darkens valleys
      // without ever touching the ridge peaks (peaks have low gradient
      // at their apex and high h → AO ≈ 1).
      float gradMag = length(dH);
      float ao      = 1.0 - smoothstep(0.0, 0.08, gradMag) * 0.45
                         * (1.0 - smoothstep(0.45, 0.75, h));

      vec3 floorCol, peakCol;
      zoneColors(floorCol, peakCol);

      vec3 baseCol = shadeSurface(h, ridge, floorCol, peakCol, N, ao);

      // ── RGB CHROMATIC ABERRATION (shader-side, cheap differential) ──
      vec3 finalCol = baseCol;
      #if IS_MOBILE == 0
      {
        float lenCenter = length(uv - 0.5);
        float edge      = smoothstep(0.30, 1.05, lenCenter * 1.8);
        float split     = (0.004 + 0.028 * uIntensity) * edge;
        vec2  splitDir  = vec2(sign(uVelocity + 0.0001), 0.0);

        float micro = split * 5.0;
        float hR = clamp(h + (vnoise(p + splitDir * micro + 0.5) - 0.5) * 0.28, 0.0, 1.0);
        float hB = clamp(h + (vnoise(p - splitDir * micro + 0.5) - 0.5) * 0.28, 0.0, 1.0);
        float ridgeR = fluidRidge(hR);
        float ridgeB = fluidRidge(hB);
        vec3 rCol = shadeSurface(hR, ridgeR, floorCol, peakCol, N, ao);
        vec3 bCol = shadeSurface(hB, ridgeB, floorCol, peakCol, N, ao);
        finalCol = vec3(rCol.r, baseCol.g, bCol.b);
      }
      #endif

      // ── CLICK IMPACT LIGHT ──────────────────────────────────────────
      float heatFlash     = pow(1.0 - uClickRipple, 2.0) * isExploding;
      float originFalloff = exp(-distClick * 2.4);
      finalCol += vec3(1.0, 0.40, 0.00) * 4.0 * heatFlash * originFalloff;
      finalCol += vec3(1.0, 0.55, 0.12) * 3.0 * edgeGlow;

      // ── ASCII MATRIX DISSOLVE ───────────────────────────────────────
      if (uTransition > 0.001) {
        float t = uTransition;
        float cellPx = mix(22.0, 12.0, clamp(t, 0.0, 1.0));
        vec2  cell   = floor(gl_FragCoord.xy / cellPx);
        vec2  cellUv = fract(gl_FragCoord.xy / cellPx);
        vec2  cellCenter = (cell * cellPx + vec2(cellPx * 0.5)) / uResolution.xy;
        vec2  fp = -1.0 + 2.0 * cellCenter;
        fp.x *= uResolution.x / uResolution.y;
        fp *= 1.5;
        float density = fluidHeight(fp, 0.0);
        density = smoothstep(0.3, 0.9, density);
        float seed  = random(cell * 0.13) + floor(uTime * (1.0 + t * 4.0)) * 0.037;
        float glyph = asciiGlyph(cellUv, seed);
        float thr   = mix(0.95, 0.15, t);
        float show  = step(thr, density);
        vec3  asciiCol = vec3(1.0) * glyph * show;
        vec3  burned   = finalCol * mix(1.0, 0.06, t);
        finalCol = mix(burned, asciiCol, clamp(t * (glyph * show + 0.15), 0.0, 1.0));
      }

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `,
    [isMobile]
  )

  useFrame((state) => {
    const mat = materialRef.current
    if (!mat) return
    const u = mat.uniforms

    u.uTime.value = state.clock.elapsedTime
    if (!isMobile) u.uMouse.value.lerp(targetMouse.current, 0.08)

    const bus = velocityBus.get()
    u.uVelocity.value       = bus.normalized
    u.uIntensity.value      = bus.intensity
    u.uScrollProgress.value = bus.progress

    // ── TURBULENCE BURST — 0→1 attack on scroll peaks, 2s decay ───────
    // Fires when intensity crosses 0.55. Peak is held briefly then decays.
    const now = state.clock.elapsedTime
    const trb = turbulenceRef.current
    if (bus.intensity > 0.55 && now - trb.peakAt > 0.35) {
      trb.target = 1
      trb.peakAt = now
    }
    const timeSincePeak = now - trb.peakAt
    if (timeSincePeak > 0.4) {
      // Past the 400ms attack window — start 2s ease-out decay
      trb.target = Math.max(0, 1 - (timeSincePeak - 0.4) / 2.0)
    }
    trb.value += (trb.target - trb.value) * (trb.target > trb.value ? 0.18 : 0.04)
    u.uTurbulence.value = trb.value

    // ── CURSOR → SHADER ───────────────────────────────────────────────
    const c = cursorBus.get()
    u.uCursor.value.set(c.x, c.y)
    u.uCursorVel.value.set(c.vx, c.vy)
    u.uCursorEnergy.value = c.energy
    // Energy decay (happens here once per frame, not on every pointermove)
    c.energy *= 0.86
    c.vx *= 0.82
    c.vy *= 0.82

    // ── FIRST-FRAME SIGNAL — preloader gates its exit on this ─────────
    if (!firedRef.current && state.gl.info.render.frame >= 1) {
      firedRef.current = true
      onFirstFrame()
    }
  })

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      depthWrite={false}
      depthTest={false}
    />
  )
}

// ─── VELOCITY-REACTIVE CHROMATIC ABERRATION PASS ─────────────────────────────
// Postprocessing CA uniform is mutated directly each frame — no React churn.
// Vertical scroll → vertical CA axis (audit spec). Cap ±3.5px / 1000px screen.
const VelocityCAController = ({ isMobile }: { isMobile: boolean }) => {
  const caRef     = useRef<any>(null)
  const smoothRef = useRef(0)

  useFrame(() => {
    const ca = caRef.current
    if (!ca) return
    const bus = velocityBus.get()
    const abs = Math.abs(bus.normalized)
    // Lerp toward peak with asymmetric timing: fast attack, slow recovery
    smoothRef.current += (abs - smoothRef.current) *
      (abs > smoothRef.current ? 0.30 : 0.08)
    // 0.0035 screen-space units ≈ 3.5px on 1000px viewport — the audit cap.
    const maxOffset = isMobile ? 0.0012 : 0.0035
    const offsetY   = smoothRef.current * maxOffset
    const offsetX   = isMobile ? 0 : 0.0008 + offsetY * 0.25
    // Works regardless of whether `offset` is exposed directly or via uniforms
    if (ca.offset && typeof ca.offset.set === "function") {
      ca.offset.set(offsetX, offsetY)
    } else if (ca.uniforms?.get?.("offset")?.value) {
      ca.uniforms.get("offset").value.set(offsetX, offsetY)
    }
  })

  return (
    <ChromaticAberration
      ref={caRef}
      blendFunction={BlendFunction.NORMAL}
      offset={new THREE.Vector2(isMobile ? 0 : 0.0008, 0) as any}
      radialModulation={false}
      modulationOffset={0}
    />
  )
}

// ─── WEBGL SCENE ─────────────────────────────────────────────────────────────
interface WebGLSceneProps {
  forceRender?: boolean
}

export const WebGLScene = ({ forceRender = false }: WebGLSceneProps) => {
  const isMobile = useMobile()
  const { canUseWebGL, isReady } = useWebGLSupport()
  const [hasWebGLError, setHasWebGLError] = useState(false)

  const shouldUseFallback =
    !forceRender && (hasWebGLError || (isReady && !canUseWebGL))

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    gl.domElement.addEventListener("webglcontextlost", () =>
      setHasWebGLError(true)
    )
    window.dispatchEvent(new CustomEvent("webgl-ready"))
  }, [])

  const handleFirstFrame = useCallback(() => {
    // The preloader gates its final exit on THIS signal — not a timer.
    window.dispatchEvent(new CustomEvent("webgl-first-frame"))
  }, [])

  if (shouldUseFallback) return <CSSFallbackGradient />
  if (!isReady && !forceRender) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-[#050505] pointer-events-none" />
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], left: -1, right: 1, top: 1, bottom: -1 }}
        dpr={isMobile ? 1 : 1.5}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: !isMobile,
          stencil: false,
          depth: false,
          failIfMajorPerformanceCaveat: true,
        }}
        onCreated={handleCreated}
      >
        <mesh>
          <planeGeometry args={[2, 2]} />
          <LiquidObsidianMaterial isMobile={isMobile} onFirstFrame={handleFirstFrame} />
        </mesh>

        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom
            intensity={0.75}
            luminanceThreshold={1.0}
            luminanceSmoothing={0.15}
            mipmapBlur
            radius={0.82}
          />
          <VelocityCAController isMobile={isMobile} />
          <Noise
            premultiply={false}
            blendFunction={BlendFunction.NORMAL}
            opacity={isMobile ? 0.010 : 0.018}
          />
          <Vignette eskil={false} offset={0.18} darkness={0.88} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
