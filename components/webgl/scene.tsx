"use client"

import { useRef, useMemo, useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import gsap from "gsap"
import { useMobile } from "@/hooks/use-mobile"
import { useWebGLSupport } from "@/hooks/use-webgl-support"
import { CSSFallbackGradient } from "./css-fallback-gradient"

type LiquidProps = {
  isMobile: boolean
}

const LiquidObsidianMaterial = ({ isMobile }: LiquidProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const targetMouse = useRef(new THREE.Vector2(0, 0))
  const scrollData = useRef({ velocity: 0, progress: 0 })

  useEffect(() => {
    let lastY = window.scrollY

    if (materialRef.current) {
      materialRef.current.uniforms.uResolution.value.set(
        window.innerWidth,
        window.innerHeight,
      )
    }

    const handleScroll = () => {
      const currentY = window.scrollY
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      )
      scrollData.current.progress = currentY / maxScroll
      scrollData.current.velocity = (currentY - lastY) * 0.05
      lastY = currentY
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight,
        )
      }
    }

    const handleShootEvent = (e: Event) => {
      if (!materialRef.current) return
      const ev = e as CustomEvent<{ x: number; y: number }>
      const clickX = (ev.detail.x / window.innerWidth) * 2 - 1
      const clickY = -(ev.detail.y / window.innerHeight) * 2 + 1

      materialRef.current.uniforms.uClickPos.value.set(clickX, clickY)

      gsap.fromTo(
        materialRef.current.uniforms.uClickRipple,
        { value: 0.0 },
        {
          value: 1.0,
          duration: 2.5,
          ease: "power3.out",
          overwrite: "auto",
        },
      )
    }

    const handleSpeedBoost = (e: Event) => {
      const ev = e as CustomEvent<{ speed: number }>
      ;(window as unknown as { webglBoost: number }).webglBoost = ev.detail.speed
    }

    const handleTransitionSet = (e: Event) => {
      if (!materialRef.current) return
      const ev = e as CustomEvent<{ value: number; color?: number }>
      
      // Ukládáme natvrdo, plynulost už řeší GSAP v page.tsx
      materialRef.current.uniforms.uTransition.value = Math.max(0, Math.min(1, ev.detail.value));

      if (typeof ev.detail.color === "number") {
        materialRef.current.uniforms.uZoneOverride.value = ev.detail.color
      }
    }

    handleScroll()

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleResize)
    window.addEventListener("webgl-shoot", handleShootEvent as EventListener)
    window.addEventListener("webgl-speed-boost", handleSpeedBoost as EventListener)
    window.addEventListener("webgl-transition", handleTransitionSet as EventListener)

    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true })
    }

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("webgl-shoot", handleShootEvent as EventListener)
      window.removeEventListener("webgl-speed-boost", handleSpeedBoost as EventListener)
      window.removeEventListener("webgl-transition", handleTransitionSet as EventListener)
      if (!isMobile) window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [isMobile])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScrollVelocity: { value: 0 },
      uScrollProgress: { value: 0 },
      uClickPos: { value: new THREE.Vector2(0, 0) },
      uClickRipple: { value: 1.0 },
      uTransition: { value: 0.0 },
      uZoneOverride: { value: -1.0 },
    }),
    [],
  )

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  const fragmentShader = useMemo(
    () => `
    #ifdef GL_ES
    precision ${isMobile ? "mediump" : "highp"} float;
    #endif
    #define ITERATIONS ${isMobile ? "2" : "3"}
    #define IS_MOBILE ${isMobile ? "1" : "0"}

    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uScrollVelocity;
    uniform float uScrollProgress;
    uniform vec2 uClickPos;
    uniform float uClickRipple;
    uniform float uTransition;
    uniform float uZoneOverride;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    // Původní Opus 4.7 Procedural ASCII glyph
    float asciiGlyph(vec2 cellUv, float seed) {
      vec2 g = floor(cellUv * vec2(5.0, 7.0));
      float r = random(g + vec2(seed * 13.0, seed * 7.0));
      float threshold = mix(0.35, 0.72, fract(seed * 1.37));
      float on = step(threshold, r);
      vec2 frac = fract(cellUv * vec2(5.0, 7.0));
      float inner = step(0.1, frac.x) * step(0.1, frac.y) * step(frac.x, 0.9) * step(frac.y, 0.9);
      return on * inner;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = -1.0 + 2.0 * uv;
      p.x *= uResolution.x / uResolution.y;

      vec2 cp = uClickPos;
      cp.x *= uResolution.x / uResolution.y;

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

      float distClick = length(p - cp);
      float ring = smoothstep(uClickRipple * 3.0 - 0.2, uClickRipple * 3.0, distClick) -
                   smoothstep(uClickRipple * 3.0, uClickRipple * 3.0 + 0.2, distClick);
      float isExploding = step(uClickRipple, 0.99);
      p += normalize(p - cp + vec2(0.0001)) * ring * (1.0 - uClickRipple) * 0.8 * isExploding;

      p.y -= uScrollVelocity * 0.2;
      p *= 1.5;

      for (int i = 1; i <= ITERATIONS; i++) {
        vec2 newp = p;
        float fi = float(i);
        float phase = uTime * 0.3 + mousePower * 2.0;
        newp.x += 0.6 / fi * sin(fi * p.y + phase + 0.3 * fi) + 1.0;
        newp.y += 0.6 / fi * sin(fi * p.x + phase + 0.3 * (fi + 10.0)) - 1.4;
        p = newp;
      }

      float val = sin(p.x + p.y) * 0.5 + 0.5;
      val = smoothstep(0.15, 0.85, val);

      // Správná paleta
      vec3 colObsidian = mix(vec3(0.008, 0.008, 0.012), vec3(0.10, 0.10, 0.13), val);
      vec3 colCobalt   = mix(vec3(0.0, 0.02, 0.18), vec3(0.0, 0.16, 1.0), val); // Homepage Blue
      vec3 colNuke     = mix(vec3(0.12, 0.02, 0.0), vec3(1.0, 0.30, 0.0), val); // Nuke Orange
      vec3 colEmerald  = mix(vec3(0.0, 0.04, 0.02), vec3(0.0, 0.40, 0.15), val); // Emerald Green

      vec3 finalCol = colObsidian;

      // Homepage logika
      float mixCobalt = smoothstep(0.08, 0.40, uScrollProgress) - smoothstep(0.62, 0.90, uScrollProgress);
      finalCol = mix(finalCol, colCobalt, mixCobalt);
      float mixNuke = smoothstep(0.70, 0.98, uScrollProgress);
      finalCol = mix(finalCol, colNuke, mixNuke);

      // Projektová logika
      if (uZoneOverride > -0.5) {
        if (uZoneOverride < 0.5) finalCol = colObsidian;
        else if (uZoneOverride < 1.5) finalCol = colCobalt;
        else if (uZoneOverride < 2.5) finalCol = colNuke; // 2 = Orange
        else finalCol = colEmerald; // 3 = Green
      }

      float heatFlash = (1.0 - uClickRipple) * isExploding;
      finalCol = mix(finalCol, mix(vec3(1.0, 0.30, 0.0), vec3(1.0, 0.8, 0.3), val), heatFlash);

      float specular = pow(val, 3.0) * mousePower;
      finalCol += vec3(0.3, 0.4, 0.7) * specular * 1.2;

      float grain = random(uv * 300.0 + fract(uTime));
      finalCol += (grain - 0.5) * 0.06;

      // Původní Opus 4.7 ASCII MATRIX DISSOLVE
      if (uTransition > 0.001) {
        float t = uTransition;
        float cellPx = mix(22.0, 12.0, clamp(t, 0.0, 1.0));
        vec2 cell = floor(gl_FragCoord.xy / cellPx);
        vec2 cellUv = fract(gl_FragCoord.xy / cellPx);

        vec2 cellCenter = (cell * cellPx + vec2(cellPx * 0.5)) / uResolution.xy;
        vec2 fp = -1.0 + 2.0 * cellCenter;
        fp.x *= uResolution.x / uResolution.y;
        fp *= 1.5;
        for (int i = 1; i <= ITERATIONS; i++) {
          vec2 newp = fp;
          float fi = float(i);
          float phase = uTime * 0.3;
          newp.x += 0.6 / fi * sin(fi * fp.y + phase + 0.3 * fi) + 1.0;
          newp.y += 0.6 / fi * sin(fi * fp.x + phase + 0.3 * (fi + 10.0)) - 1.4;
          fp = newp;
        }
        float density = sin(fp.x + fp.y) * 0.5 + 0.5;
        density = smoothstep(0.2, 0.9, density);

        float seed = random(cell * 0.13) + floor(uTime * (1.0 + t * 4.0)) * 0.037;
        float glyph = asciiGlyph(cellUv, seed);

        float keep = step(1.0 - (density * 0.95 + 0.05) * (0.3 + t * 0.9), 1.0 - step(0.01, density));
        float thr = mix(0.95, 0.15, t);
        float show = step(thr, density);

        vec3 asciiCol = vec3(1.0) * glyph * show;

        vec3 burned = finalCol * mix(1.0, 0.08, t);
        finalCol = mix(burned, asciiCol, clamp(t * (glyph * show + 0.15), 0.0, 1.0));
      }

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `,
    [isMobile],
  )

  useFrame((state) => {
    if (!materialRef.current) return
    const mats = materialRef.current.uniforms
    mats.uTime.value = state.clock.elapsedTime

    if (!isMobile) {
      mats.uMouse.value.lerp(targetMouse.current, 0.1)
    }

    scrollData.current.velocity *= 0.9

    const w = window as unknown as { webglBoost?: number }
    const externalBoost = w.webglBoost || 0
    const finalVelocity = scrollData.current.velocity + externalBoost

    mats.uScrollVelocity.value = THREE.MathUtils.lerp(
      mats.uScrollVelocity.value,
      finalVelocity,
      0.1,
    )
    mats.uScrollProgress.value = scrollData.current.progress

    if (Math.abs(w.webglBoost || 0) > 0.01) {
      w.webglBoost = (w.webglBoost as number) * 0.9
    } else {
      w.webglBoost = 0
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

interface WebGLSceneProps {
  forceRender?: boolean
}

export const WebGLScene = ({ forceRender = false }: WebGLSceneProps) => {
  const isMobile = useMobile()
  const { canUseWebGL, isReady } = useWebGLSupport()
  const [hasWebGLError, setHasWebGLError] = useState(false)

  const shouldUseFallback =
    !forceRender && (hasWebGLError || (isReady && !canUseWebGL))

  if (shouldUseFallback) {
    return <CSSFallbackGradient />
  }

  if (!isReady && !forceRender) {
    return (
      <div className="fixed inset-0 w-full h-full z-0 bg-[#020203] pointer-events-none" />
    )
  }

  return (
    <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], left: -1, right: 1, top: 1, bottom: -1 }}
        dpr={isMobile ? 0.75 : 1}
        gl={{
          powerPreference: "high-performance",
          alpha: false,
          antialias: false,
          stencil: false,
          depth: false,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => {
            setHasWebGLError(true)
          })
          window.dispatchEvent(new CustomEvent("webgl-ready"))
        }}
      >
        <mesh>
          <planeGeometry args={[2, 2]} />
          <LiquidObsidianMaterial isMobile={isMobile} />
        </mesh>
      </Canvas>
    </div>
  )
}