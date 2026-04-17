"use client";

import { useRef, useMemo, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { useMobile } from "@/hooks/use-mobile";

// Fallback gradient for when WebGL fails or is loading
const CSSFallbackBackground = () => (
  <div 
    className="fixed inset-0 w-full h-full z-0 pointer-events-none"
    style={{
      background: `
        radial-gradient(ellipse at 30% 20%, rgba(20, 20, 25, 1) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 80%, rgba(15, 15, 20, 1) 0%, transparent 50%),
        linear-gradient(180deg, #0a0a0c 0%, #050507 50%, #020203 100%)
      `
    }}
  />
);

const LiquidObsidianMaterial = ({ isMobile }: { isMobile: boolean }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const targetMouse = useRef(new THREE.Vector2(0, 0));
  const scrollData = useRef({ velocity: 0, progress: 0 });
  const isInitialized = useRef(false);

  useEffect(() => {
    let lastY = window.scrollY;
    
    // Delayed initialization for better stability
    const initTimeout = setTimeout(() => {
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        isInitialized.current = true;
      }
    }, 100);
    
    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      
      scrollData.current.progress = currentY / maxScroll;
      scrollData.current.velocity = (currentY - lastY) * 0.05;
      lastY = currentY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetMouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    const handleShootEvent = (e: CustomEvent) => {
      if (!materialRef.current) return;
      const clickX = (e.detail.x / window.innerWidth) * 2 - 1;
      const clickY = -(e.detail.y / window.innerHeight) * 2 + 1;
      
      materialRef.current.uniforms.uClickPos.value.set(clickX, clickY);

      gsap.fromTo(
        materialRef.current.uniforms.uClickRipple,
        { value: 0.0 },
        { value: 1.0, duration: 2.5, ease: "power3.out", overwrite: "auto" }
      );
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    window.addEventListener("webgl-shoot", handleShootEvent as EventListener);
    
    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
    }

    return () => {
      clearTimeout(initTimeout);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("webgl-shoot", handleShootEvent as EventListener);
      if (!isMobile) window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMobile]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth || 1920, window.innerHeight || 1080) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScrollVelocity: { value: 0 },
    uScrollProgress: { value: 0 },
    uClickPos: { value: new THREE.Vector2(0, 0) },
    uClickRipple: { value: 1.0 }, 
  }),[]);

  const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`;

  // Optimized shader with fallback colors and better mobile performance
  const fragmentShader = useMemo(() => `
    precision ${isMobile ? 'mediump' : 'highp'} float;
    
    #define ITERATIONS ${isMobile ? '2' : '4'}
    
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uScrollVelocity;
    uniform float uScrollProgress;
    uniform vec2 uClickPos;
    uniform float uClickRipple;

    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    void main() {
      // Safety check for resolution
      vec2 res = max(uResolution, vec2(1.0));
      vec2 uv = gl_FragCoord.xy / res;
      vec2 p = -1.0 + 2.0 * uv;
      float aspect = res.x / res.y;
      p.x *= aspect;

      vec2 m = uMouse;
      m.x *= aspect;
      
      vec2 cp = uClickPos;
      cp.x *= aspect;

      vec2 delta = p - m;
      float distMouse = length(delta);
      float mousePower = exp(-distMouse * 6.0); 
      
      // Simplified mouse interaction for mobile
      #if ITERATIONS > 2
        p = m + rot(mousePower * 1.5) * delta; 
        p -= normalize(delta + vec2(0.0001)) * mousePower * 0.15;
      #endif

      float distClick = length(p - cp);
      float ring = smoothstep(uClickRipple * 3.0 - 0.2, uClickRipple * 3.0, distClick) - 
                   smoothstep(uClickRipple * 3.0, uClickRipple * 3.0 + 0.2, distClick);
      float isExploding = step(uClickRipple, 0.99); 
      p += normalize(p - cp + vec2(0.0001)) * ring * (1.0 - uClickRipple) * 0.8 * isExploding;

      p.y -= uScrollVelocity * 0.15;
      p *= 1.5;

      // Optimized loop with reduced complexity on mobile
      for(int i = 1; i <= ITERATIONS; i++) {
        vec2 newp = p;
        float fi = float(i);
        float phase = uTime * 0.25 + mousePower * 1.5; 
        
        newp.x += 0.5 / fi * sin(fi * p.y + phase + 0.3 * fi) + 1.0;
        newp.y += 0.5 / fi * sin(fi * p.x + phase + 0.3 * (fi + 10.0)) - 1.4;
        p = newp;
      }

      float val = sin(p.x + p.y) * 0.5 + 0.5;
      val = smoothstep(0.1, 0.9, val); 

      // Base colors with guaranteed dark fallback
      vec3 colBase = vec3(0.02, 0.02, 0.025);
      vec3 colHero = mix(colBase, vec3(0.12, 0.12, 0.15), val);
      vec3 colWork = mix(vec3(0.02, 0.04, 0.08), vec3(0.08, 0.25, 0.5), val);
      vec3 colNuke = mix(vec3(0.12, 0.02, 0.0), vec3(0.8, 0.25, 0.0), val);

      vec3 finalCol = colHero;
      
      float mixWork = smoothstep(0.1, 0.4, uScrollProgress) - smoothstep(0.6, 0.9, uScrollProgress);
      finalCol = mix(finalCol, colWork, mixWork);
      
      float mixNuke = smoothstep(0.7, 0.95, uScrollProgress);
      finalCol = mix(finalCol, colNuke, mixNuke);

      float heatFlash = (1.0 - uClickRipple) * isExploding;
      finalCol = mix(finalCol, mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.8, 0.2), val), heatFlash);

      #if ITERATIONS > 2
        float specular = pow(val, 3.0) * mousePower; 
        finalCol += vec3(0.4, 0.5, 0.7) * specular * 1.2;
      #endif

      // Subtle grain (reduced on mobile)
      float grainStrength = ${isMobile ? '0.04' : '0.06'};
      float grain = random(uv * 200.0 + fract(uTime * 0.5)); 
      finalCol += (grain - 0.5) * grainStrength; 

      // Ensure we never output pure black
      finalCol = max(finalCol, colBase);

      gl_FragColor = vec4(finalCol, 1.0);
    }
  `, [isMobile]);

  useFrame((state) => {
    if (!materialRef.current || !isInitialized.current) return;
    const mats = materialRef.current.uniforms;
    mats.uTime.value = state.clock.elapsedTime;
    
    if (!isMobile) {
      mats.uMouse.value.lerp(targetMouse.current, 0.08); 
    }
    
    scrollData.current.velocity *= 0.92;
    mats.uScrollVelocity.value = THREE.MathUtils.lerp(mats.uScrollVelocity.value, scrollData.current.velocity, 0.08);
    mats.uScrollProgress.value = scrollData.current.progress;
  });

  return <shaderMaterial ref={materialRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} depthWrite={false} depthTest={false} />;
};

const Scene = ({ isMobile }: { isMobile: boolean }) => {
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <LiquidObsidianMaterial isMobile={isMobile} />
    </mesh>
  );
};

export const WebGLScene = () => {
  const isMobile = useMobile();
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check for WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasError(true);
        return;
      }
    } catch {
      setHasError(true);
      return;
    }

    // Delay mounting for stability
    const timeout = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  if (hasError) {
    return <CSSFallbackBackground />;
  }

  return (
    <>
      {/* CSS fallback always visible underneath */}
      <CSSFallbackBackground />
      
      {isReady && (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
          <Canvas 
            orthographic 
            camera={{ position: [0, 0, 1], left: -1, right: 1, top: 1, bottom: -1 }} 
            dpr={isMobile ? [0.5, 0.75] : [1, 1.5]}
            gl={{ 
              powerPreference: isMobile ? "low-power" : "high-performance", 
              alpha: true, 
              antialias: false, 
              stencil: false, 
              depth: false,
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: false,
            }}
            onCreated={() => {
              // Canvas successfully created
            }}
            onError={() => setHasError(true)}
          >
            <Suspense fallback={null}>
              <Scene isMobile={isMobile} />
            </Suspense>
          </Canvas>
        </div>
      )}
    </>
  );
};
