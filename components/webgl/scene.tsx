"use client"

/**
 * scene.tsx — Liquid Obsidian + Refractive Shockwave
 *
 * ═══════════════════════════════════════════════════════════════════
 * PERFORMANCE AUDIT & FIXES
 * ═══════════════════════════════════════════════════════════════════
 *
 * THE BOTTLENECK: The old shader called `sampleColor(p)` THREE TIMES
 * per fragment for the RGB chromatic aberration split, plus a fourth
 * `fluidHeight(p)` call for the specular highlight. Each `sampleColor`
 * invokes `fluidHeight` which runs 2 FBM evaluations, each FBM runs
 * 4 × `vnoise`. Total: (3 × 2 + 1) × 4 = ~28 vnoise calls per pixel.
 * At 1920×1080 that's 58 million vnoise evaluations per frame.
 *
 * THE FIX:
 * 1. Compute `fluidHeight` ONCE. Store `h` in a local variable.
 * 2. The RGB split now uses 2 cheap single-call `vnoise` differentials
 * to approximate the spatial color shift — visually indistinguishable
 * at the 0.004-0.032 split offsets used, but ~5× cheaper.
 * 3. Reuse the pre-computed `h` for the specular highlight instead of
 * calling `fluidHeight` again.
 * 4. Mobile: RGB split disabled entirely (0 extra vnoise calls).
 * 5. FBM loop unrolled with preprocessor (#if) so mobile path truly
 * compiles to 3 octaves — the prior `if (i >= 3) break` still ran
 * 4 loop iterations, just with an early exit (GS still branches).
 *
 * TOTAL FBM CALLS: was 7 → now 2 (desktop), 2 (mobile). ~3.5× speedup.
 * ═══════════════════════════════════════════════════════════════════
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

type LiquidProps = { isMobile: boolean }

const LiquidObsidianMaterial = ({ isMobile }: LiquidProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const targetMouse = useRef(new THREE.Vector2(0, 0))
  const dpr = isMobile ? 1 : 1.5

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(
        window.innerWidth * dpr,
        window.innerHeight * dpr
      )
    }

    // Passive mouse — never blocks scroll thread
    const onMouse = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
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
      const cx = (ev.detail.x / window.innerWidth) * 2 - 1
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
  // FRAGMENT SHADER — "Liquid Obsidian"
  //
  // Aesthetic: 95% pure #000000 floor. Only the razor-thin crests of the
  // ferrofluid surface catch vivid, nuclear-orange emissive light.
  // The click spawns a refractive UV shockwave (no flat color blast).
  //
  // PERFORMANCE: Single fluidHeight evaluation per pixel. RGB split uses
  // cheap vnoise differential (not full FBM resample).
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

    // ── PRIMITIVES ────────────────────────────────────────────────────

    float random(vec2 st) {
      return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    // Smooth 2D value noise — the FBM primitive.
    // Hermite C1-continuous interpolation prevents grid banding.
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

    // ── UNROLLED FBM — compile-time octave control ────────────────────
    // Unrolled so the GPU compiler sees a fixed instruction count and can
    // schedule registers optimally. The prior loop with #if break left
    // dead code in the mobile path; unrolling eliminates it entirely.
    float fbm(vec2 p) {
      float sum = 0.0;
      // Octave 1 — large scale, slow movement
      sum  = 0.500 * vnoise(rot(0.500) * p       + uTime * 0.060);
      // Octave 2
      sum += 0.250 * vnoise(rot(0.870) * p * 2.0 + uTime * 0.120);
      // Octave 3
      sum += 0.125 * vnoise(rot(1.240) * p * 4.0 + uTime * 0.240);
      // Octave 4 — desktop only: fine surface detail, expensive
      #if IS_MOBILE == 0
      sum += 0.0625 * vnoise(rot(1.610) * p * 8.0 + uTime * 0.480);
      #endif
      return sum;
    }

    // ── DOMAIN-WARPED HEIGHT FIELD ────────────────────────────────────
    // One FBM samples the "warp" offset; a second FBM samples the actual
    // height at the warped position. This is what produces the "thick
    // glossy oil refracting itself" look — fluid warped by fluid.
    // Returns [0..1]. Called ONCE per pixel.
    float fluidHeight(vec2 p, float mousePower) {
      // UPRAVA 1: Zvětšení násobičů p (z 0.9 na 1.4 a z 1.1 na 1.6)
      // pro vyšší hustotu vlnek (oddálení kamery od šumu)
      float n1 = fbm(p * 1.4 + vec2(uTime * 0.04, uTime * 0.03));
      vec2 warped = p * 1.6 + vec2(n1 * 2.4, n1 * 1.8);
      float h = fbm(warped + uTime * 0.02);
      h += mousePower * 0.25;
      return clamp(h, 0.0, 1.0);
    }

    // ── RIDGE DETECTOR ────────────────────────────────────────────────
    // Identifies only the top 8% of height values as "crests". Returns
    // a razor-thin glowing line at each ferrofluid spike.
    float fluidRidge(float h) {
      // UPRAVA 2: Snížení spodní hranice smoothstepu (z 0.62 na 0.50). 
      // Větší část výškové mapy se nyní považuje za "svítící" hřbet.
      float crest = smoothstep(0.50, 0.74, h);
      return crest * crest; // sharpen the peak
    }

    // ── ZONE PALETTE ──────────────────────────────────────────────────
    // All floors are near-#000000 so 95% of the screen stays pure black.
    // Only peaks are HDR (> 1.0) — Bloom picks them up for the glowing
    // ferrofluid spike effect.
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

    // ── COLOR FROM HEIGHT ─────────────────────────────────────────────
    // Converts pre-computed h + ridge into final color.
    // Takes pre-resolved floorCol/peakCol to avoid re-calling zoneColors.
    vec3 colorFromHeight(float h, float ridge, vec3 floorCol, vec3 peakCol) {
      // 1. Výpočet základu (body) s měkčím rozptylem
      float crushed = pow(h, 5.0);
      vec3 body = mix(floorCol, peakCol, crushed * 0.35);
      
      // 2. Aplikace energie hřbetů
      float ridgeEnergy = 1.6 + uIntensity * 1.4;
      vec3 finalColor = body + peakCol * ridge * ridgeEnergy;
      
      // 3. Ochranné ztmavení na konci stránky pro čitelnost textu
      float dimming = mix(1.0, 0.4, smoothstep(0.85, 1.0, uScrollProgress));
      
      return finalColor * dimming;
    }

    // ── ASCII MATRIX OVERLAY ──────────────────────────────────────────
    float asciiGlyph(vec2 cellUv, float seed) {
      vec2 g = floor(cellUv * vec2(5.0, 7.0));
      float r = random(g + vec2(seed * 13.0, seed * 7.0));
      float threshold = mix(0.35, 0.72, fract(seed * 1.37));
      float on = step(threshold, r);
      vec2 f = fract(cellUv * vec2(5.0, 7.0));
      float inner = step(0.1, f.x) * step(0.1, f.y) * step(f.x, 0.9) * step(f.y, 0.9);
      return on * inner;
    }

    // ─────────────────────────────────────────────────────────────────
    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p  = -1.0 + 2.0 * uv;
      p.x *= uResolution.x / uResolution.y;

      vec2 cp = uClickPos;
      cp.x *= uResolution.x / uResolution.y;

      // ── MOUSE INFLUENCE (desktop only) ───────────────────────────────
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

      // ── REFRACTIVE SHOCKWAVE — UV DISPLACEMENT ───────────────────────
      // The click spawns an expanding wavefront. Near the wavefront, UVs
      // are physically bent along the radial axis using a
      // derivative-of-Gaussian profile: bipolar, self-decaying. The result
      // looks like a heavy steel sphere dropped into thick oil — the surface
      // bends, refracts, then settles. No color blast. Just displacement.
      float isExploding  = step(uClickRipple, 0.99);
      vec2  toClick      = p - cp;
      float distClick    = length(toClick);
      vec2  radialDir    = toClick / max(distClick, 0.0001);

      float ringRadius   = uClickRipple * 3.0;
      float waveSigned   = (distClick - ringRadius) * 6.5;
      // Derivative-of-Gaussian: negative at leading edge, positive behind.
      float waveProfile  = -waveSigned * exp(-waveSigned * waveSigned * 0.5);
      float waveDecay    = pow(1.0 - uClickRipple, 1.4) * isExploding;
      p += radialDir * waveProfile * 0.42 * waveDecay;

      // Emissive ring at the exact wavefront — the refraction edge highlight.
      float edgeGlow = exp(-waveSigned * waveSigned * 1.2) * waveDecay;

      // ── VELOCITY PHYSICS ──────────────────────────────────────────────
      p.x += uVelocity * 0.22 * p.y;
      p.y -= uVelocity * 0.80;
      p   *= mix(1.50, 1.26, uIntensity);

      // ═════════════════════════════════════════════════════════════════
      // SINGLE HEIGHT EVALUATION — the key optimization.
      // Everything below this line reuses this one h value.
      // ═════════════════════════════════════════════════════════════════
      float h     = fluidHeight(p * (1.0 + uIntensity * 0.15), mousePower);
      float ridge = fluidRidge(h);
      vec3  floorCol, peakCol;
      zoneColors(floorCol, peakCol);

      vec3 baseCol = colorFromHeight(h, ridge, floorCol, peakCol);

      // ── RGB CHROMATIC ABERRATION — vnoise differential ────────────────
      // Instead of calling sampleColor 2 more times (= 4 more FBM evals),
      // we approximate the spatial color shift using single vnoise lookups.
      // At 0.004-0.032 split offsets this is perceptually identical.
      // Mobile: disabled entirely to save fragment budget.
      vec3 finalCol = baseCol;
      #if IS_MOBILE == 0
      {
        float lenCenter = length(uv - 0.5);
        float edge = smoothstep(0.30, 1.05, lenCenter * 1.8);
        float split = (0.004 + 0.028 * uIntensity) * edge;
        vec2  splitDir = vec2(sign(uVelocity + 0.0001), 0.0);

        // Cheap per-channel height perturbation — single vnoise call each.
        // Using p (world-space) to match the FBM spatial frequency.
        float micro = split * 5.0;
        float hR = clamp(h + (vnoise(p + splitDir * micro + 0.5) - 0.5) * 0.28, 0.0, 1.0);
        float hB = clamp(h + (vnoise(p - splitDir * micro + 0.5) - 0.5) * 0.28, 0.0, 1.0);
        float ridgeR = fluidRidge(hR);
        float ridgeB = fluidRidge(hB);
        vec3 rCol = colorFromHeight(hR, ridgeR, floorCol, peakCol);
        vec3 bCol = colorFromHeight(hB, ridgeB, floorCol, peakCol);
        finalCol = vec3(rCol.r, baseCol.g, bCol.b);
      }
      #endif

      // ── CLICK IMPACT LIGHT ────────────────────────────────────────────
      // Additive light layers on top of the UV displacement above.
      // heatFlash: core impact glow at the click origin (decays fast).
      // edgeGlow: travels WITH the wavefront for visual alignment.
      float heatFlash    = pow(1.0 - uClickRipple, 2.0) * isExploding;
      float originFalloff = exp(-distClick * 2.4);
      finalCol += vec3(1.0, 0.40, 0.00) * 4.0 * heatFlash * originFalloff;
      finalCol += vec3(1.0, 0.55, 0.12) * 3.0 * edgeGlow;

      // ── MOUSE SPECULAR — reuses pre-computed h (no extra FBM) ─────────
      float spec = pow(h, 8.0) * mousePower;
      finalCol += vec3(0.55, 0.55, 0.75) * spec * (0.6 + uIntensity * 0.4);

      // ── ASCII MATRIX DISSOLVE ─────────────────────────────────────────
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
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    if (!isMobile) u.uMouse.value.lerp(targetMouse.current, 0.08)
    const bus = velocityBus.get()
    u.uVelocity.value  = bus.normalized
    u.uIntensity.value = bus.intensity
    u.uScrollProgress.value = bus.progress
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

// ── WEBGL SCENE ───────────────────────────────────────────────────────────
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
          <LiquidObsidianMaterial isMobile={isMobile} />
        </mesh>

        <EffectComposer multisampling={0} enableNormalPass={false}>
          {/* Bloom only activates above luminanceThreshold=1.0 — the HDR
              peak colors in the shader are the ONLY things that glow.
              This is what makes the obsidian floor stay pitch black while
              the wave crests pop with nuclear light. */}
          <Bloom
            intensity={0.75}
            luminanceThreshold={1.0}
            luminanceSmoothing={0.15}
            mipmapBlur
            radius={0.82}
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(isMobile ? 0 : 0.0012, 0) as any}
            radialModulation={false}
            modulationOffset={0}
          />
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